import { createServerFn } from "@tanstack/react-start";

export type Banner = {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
};

export type ShuttleOrder = {
  id: string;
  team_name: string;
  buyer_name: string;
  quantity: number;
  status: string;
  created_at: string;
};

/** Public shuttle list shows team and buyer name; only approved orders are exposed. */
export type PublicShuttleOrder = {
  id: string;
  team_name: string;
  buyer_name: string;
  quantity: number;
  status: string;
  created_at: string;
};

const BANNER_COLUMNS = "id, title, message, is_active";
const ORDER_COLUMNS = "id, team_name, buyer_name, quantity, status, created_at";
const PUBLIC_ORDER_COLUMNS = "id, team_name, buyer_name, quantity, status, created_at";

// ------------------------------------------------------------------- banner

export const getBanner = createServerFn({ method: "GET" }).handler(
  async (): Promise<Banner | null> => {
    const { readClient } = await import("./tournament.server");
    const { data, error } = await readClient()
      .from("announcements")
      .select(BANNER_COLUMNS)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Banner | null) ?? null;
  },
);

export const saveBanner = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; message: string; isActive: boolean }) => {
    const title = (data?.title ?? "").trim().slice(0, 120);
    const message = (data?.message ?? "").trim().slice(0, 600);
    if (data?.isActive && title.length < 3) {
      throw new Error("Add a headline of at least 3 characters before showing the banner.");
    }
    return { title, message, isActive: data?.isActive === true };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();

    const existing = await supabase
      .from("announcements")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    const payload = { title: data.title, message: data.message, is_active: data.isActive };
    const result = existing.data
      ? await supabase.from("announcements").update(payload).eq("id", existing.data.id)
      : await supabase.from("announcements").insert(payload);
    if (result.error) throw new Error(result.error.message);
    return { ok: true as const };
  });

// ----------------------------------------------------------- shuttle orders

export const getShuttleOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ orders: PublicShuttleOrder[]; total: number }> => {
    const { adminClient } = await import("./tournament.server");
    const { data, error } = await adminClient()
      .from("shuttle_orders")
      .select(PUBLIC_ORDER_COLUMNS)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const orders = (data ?? []) as PublicShuttleOrder[];
    return { orders, total: orders.reduce((sum, o) => sum + o.quantity, 0) };
  },
);

export const submitShuttleOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { teamName: string; buyerName: string; quantity: number }) => {
    const teamName = (data?.teamName ?? "").trim();
    const buyerName = (data?.buyerName ?? "").trim();
    const quantity = Number(data?.quantity);
    if (teamName.length < 2 || teamName.length > 60) {
      throw new Error("Enter a team name (2–60 characters).");
    }
    if (buyerName.length < 2 || buyerName.length > 60) {
      throw new Error("Enter the buyer's name (2–60 characters).");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1) {
      throw new Error("Maximum 1 shuttle box per team in two weeks.");
    }
    return { teamName, buyerName, quantity };
  })
  .handler(async ({ data }) => {
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();

    if (data.quantity > 1) {
      throw new Error("Maximum 1 shuttle box per team in two weeks.");
    }

    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const recent = await supabase
      .from("shuttle_orders")
      .select("id, quantity, created_at")
      .ilike("team_name", data.teamName)
      .in("status", ["pending", "approved"])
      .gte("created_at", since);
    if (recent.error) throw new Error(recent.error.message);
    const boxes = (recent.data ?? []).reduce((sum, o) => sum + (o.quantity ?? 0), 0);
    if (boxes >= 1) {
      throw new Error(
        "This team already ordered a shuttle box in the last two weeks. Maximum 1 box per team in two weeks.",
      );
    }

    const { error } = await supabase.from("shuttle_orders").insert({
      team_name: data.teamName,
      buyer_name: data.buyerName,
      quantity: data.quantity,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getAllShuttleOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShuttleOrder[]> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { data, error } = await adminClient()
      .from("shuttle_orders")
      .select(ORDER_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ShuttleOrder[];
  },
);

export const approveShuttleOrders = createServerFn({ method: "POST" })
  .inputValidator((data: { orderIds: string[] | null }) => data ?? { orderIds: null })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    let query = adminClient()
      .from("shuttle_orders")
      .update({ status: "approved" }, { count: "exact" })
      .eq("status", "pending");
    if (Array.isArray(data.orderIds) && data.orderIds.length > 0) {
      query = query.in("id", data.orderIds);
    }
    const { error, count } = await query;
    if (error) throw new Error(error.message);
    return { approved: count ?? 0 };
  });

export const deleteShuttleOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient().from("shuttle_orders").delete().eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
