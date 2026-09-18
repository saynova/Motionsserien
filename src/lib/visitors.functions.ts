import { createServerFn } from "@tanstack/react-start";

export type VisitRow = {
  id: string;
  path: string;
  ip: string;
  device: string;
  os: string;
  browser: string;
  country: string;
  city: string;
  referrer: string;
  created_at: string;
};

export type SubmitterDetail = {
  matchId: string;
  submittedBy: string;
  submittedAt: string | null;
  ip: string;
  device: string;
  location: string;
  userAgent: string;
};

const VISIT_COLUMNS = "id, path, ip, device, os, browser, country, city, referrer, created_at";

// --------------------------------------------------------------- public write

export const logVisit = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => {
    const path = typeof data?.path === "string" ? data.path.slice(0, 300) : "/";
    return { path };
  })
  .handler(async ({ data }) => {
    const { readVisitorMeta } = await import("./visitors.server");
    const meta = readVisitorMeta();
    if (meta.isBot) return { ok: true as const };

    const { adminClient } = await import("./tournament.server");
    await adminClient()
      .from("visit_logs")
      .insert({
        path: data.path,
        ip: meta.ip,
        user_agent: meta.userAgent,
        device: meta.device,
        os: meta.os,
        browser: meta.browser,
        country: meta.country,
        city: meta.city,
        referrer: meta.referrer,
      });

    return { ok: true as const };
  });

// ---------------------------------------------------------------- admin reads

export const listVisits = createServerFn({ method: "POST" }).handler(
  async (): Promise<VisitRow[]> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");

    const { data, error } = await adminClient()
      .from("visit_logs")
      .select(VISIT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);
    return (data ?? []) as VisitRow[];
  },
);

export const purgeOldVisits = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const { adminClient } = await import("./tournament.server");

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await adminClient().from("visit_logs").delete().lt("created_at", cutoff);
  if (error) throw new Error(error.message);
  return { ok: true as const };
});

export const listSubmitterDetails = createServerFn({ method: "POST" }).handler(
  async (): Promise<SubmitterDetail[]> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");

    const { data, error } = await adminClient()
      .from("matches")
      .select(
        "id, submitted_by, submitted_at, submitted_ip, submitted_device, submitted_location, submitted_user_agent",
      )
      .not("submitted_at", "is", null);
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      matchId: row.id,
      submittedBy: row.submitted_by ?? "",
      submittedAt: row.submitted_at,
      ip: row.submitted_ip ?? "",
      device: row.submitted_device ?? "",
      location: row.submitted_location ?? "",
      userAgent: row.submitted_user_agent ?? "",
    }));
  },
);
