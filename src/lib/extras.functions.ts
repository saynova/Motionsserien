import { createServerFn } from "@tanstack/react-start";

export type Banner = {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
};

export type SupportSettings = {
  id: string;
  donation_visible: boolean;
  sponsor_visible: boolean;
  sponsor_details: string;
  qr_image_path: string | null;
  qr_image_url: string | null;
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
const SUPPORT_COLUMNS = "id, donation_visible, sponsor_visible, sponsor_details, qr_image_path";

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

// ----------------------------------------------------- donation and sponsor

export const getSupportSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SupportSettings | null> => {
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();
    const { data, error } = await supabase
      .from("site_support_settings")
      .select(SUPPORT_COLUMNS)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    let qrImageUrl: string | null = null;
    if (data.qr_image_path) {
      const signed = await supabase.storage
        .from("donation-assets")
        .createSignedUrl(data.qr_image_path, 60 * 60 * 24 * 7);
      if (!signed.error) qrImageUrl = signed.data.signedUrl;
    }

    return { ...data, qr_image_url: qrImageUrl } as SupportSettings;
  },
);

type SupportSettingsInput = {
  donationVisible: boolean;
  sponsorVisible: boolean;
  sponsorDetails: string;
  qrImage?: { base64: string; mimeType: string } | null;
  removeQr?: boolean;
};

export const saveSupportSettings = createServerFn({ method: "POST" })
  .inputValidator((data: SupportSettingsInput) => {
    const sponsorDetails = (data?.sponsorDetails ?? "").trim().slice(0, 300);
    if (data?.sponsorVisible && sponsorDetails.length < 2) {
      throw new Error("Add sponsor details before showing the sponsor banner.");
    }
    if (data?.qrImage) {
      const allowed = ["image/png", "image/jpeg", "image/webp"];
      if (!allowed.includes(data.qrImage.mimeType)) {
        throw new Error("Use a PNG, JPEG or WebP image.");
      }
      if (data.qrImage.base64.length > 2_800_000) {
        throw new Error("The QR image must be smaller than 2 MB.");
      }
    }
    return {
      donationVisible: data?.donationVisible === true,
      sponsorVisible: data?.sponsorVisible === true,
      sponsorDetails,
      qrImage: data?.qrImage ?? null,
      removeQr: data?.removeQr === true,
    };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();
    const existing = await supabase
      .from("site_support_settings")
      .select("id, qr_image_path")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    let qrImagePath = existing.data?.qr_image_path ?? null;
    if ((data.removeQr || data.qrImage) && qrImagePath) {
      const removed = await supabase.storage.from("donation-assets").remove([qrImagePath]);
      if (removed.error) throw new Error(removed.error.message);
      qrImagePath = null;
    }
    if (data.qrImage) {
      const extension = data.qrImage.mimeType === "image/png" ? "png" : data.qrImage.mimeType === "image/webp" ? "webp" : "jpg";
      qrImagePath = `swish-qr-${Date.now()}.${extension}`;
      const bytes = Uint8Array.from(atob(data.qrImage.base64), (character) => character.charCodeAt(0));
      const uploaded = await supabase.storage.from("donation-assets").upload(qrImagePath, bytes, {
        contentType: data.qrImage.mimeType,
        upsert: false,
      });
      if (uploaded.error) throw new Error(uploaded.error.message);
    }

    const payload = {
      donation_visible: data.donationVisible,
      sponsor_visible: data.sponsorVisible,
      sponsor_details: data.sponsorDetails,
      qr_image_path: qrImagePath,
    };
    const result = existing.data
      ? await supabase.from("site_support_settings").update(payload).eq("id", existing.data.id)
      : await supabase.from("site_support_settings").insert(payload);
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
