// One-day tournament: fully separate from the weekly series (own tables, own admin section).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type OnedayInfo = {
  visible: boolean;
  isOpen: boolean;
  name: string;
  eventDate: string;
  venue: string;
  paymentDetails: string;
  menuLabel: string;
  maxApproved: number | null;
  maxTotal: number | null;
  full?: boolean;
};

export type OnedayPublicTeam = { id: string; team_name: string; player1_name: string; player2_name: string; level: "intermediate" | "advanced"; category: "men" | "women" };

export type OnedayRegistration = OnedayPublicTeam & {
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  payment_status: "paid" | "unpaid";
  seen_by_admin: boolean;
  created_at: string;
};

async function db() {
  const { adminClient } = await import("./tournament.server");
  return adminClient();
}

async function admin() {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  return db();
}

async function counts() {
  const supabase = await db();
  const { data, error } = await supabase.from("oneday_registrations").select("status");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return {
    approved: rows.filter((r) => r.status === "approved").length,
    active: rows.filter((r) => r.status !== "rejected").length,
  };
}

async function readSettings() {
  const supabase = await db();
  const { data, error } = await supabase
    .from("oneday_settings")
    .select("id, visible, is_open, name, event_date, venue, payment_details, menu_label, max_approved_teams, max_total_registrations")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const getOnedayInfo = createServerFn({ method: "GET" }).handler(async (): Promise<OnedayInfo> => {
  const s = await readSettings();
  const c = await counts();
  const full =
    (s?.max_total_registrations != null && c.active >= s.max_total_registrations) ||
    (s?.max_approved_teams != null && c.approved >= s.max_approved_teams);
  return {
    full,
    maxApproved: s?.max_approved_teams ?? null,
    maxTotal: s?.max_total_registrations ?? null,
    visible: s?.visible ?? false,
    isOpen: (s?.visible ?? false) && (s?.is_open ?? false) && !full,
    name: s?.name ?? "One-day badminton tournament",
    eventDate: s?.event_date ?? "",
    venue: s?.venue ?? "",
    paymentDetails: s?.payment_details ?? "",
    menuLabel: s?.menu_label || "One-day",
  };
});

export const getOnedayApprovedTeams = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnedayPublicTeam[]> => {
    const s = await readSettings();
    if (!s?.visible) return [];
    const supabase = await db();
    const { data, error } = await supabase
      .from("oneday_registrations")
      .select("id, team_name, player1_name, player2_name, level, category")
      .eq("status", "approved")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as OnedayPublicTeam[];
  },
);

const registrationSchema = z.object({
  teamName: z.string().trim().min(2, "Team name is too short").max(60),
  player1Name: z.string().trim().min(2, "Enter Player 1's name").max(80),
  player2Name: z.string().trim().min(2, "Enter Player 2's name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid phone number")
    .max(25)
    .regex(/^[0-9+()\-\s]+$/, "Enter a valid phone number"),
  category: z.enum(["men", "women"], { errorMap: () => ({ message: "Choose Men or Women" }) }),
  level: z.enum(["intermediate", "advanced"]).optional(),
  paymentStatus: z.enum(["paid", "unpaid"], { errorMap: () => ({ message: "Choose your payment status" }) }),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms" }) }),
});

export const submitOnedayRegistration = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => registrationSchema.parse(data))
  .handler(async ({ data }) => {
    const s = await readSettings();
    if (!s?.visible || !s.is_open) throw new Error("Registration is closed.");
    const c = await counts();
    if (s.max_total_registrations != null && c.active >= s.max_total_registrations)
      throw new Error("All spots are taken. Registration is closed.");
    if (s.max_approved_teams != null && c.approved >= s.max_approved_teams)
      throw new Error("All spots are taken. Registration is closed.");
    const supabase = await db();
    const { error } = await supabase.from("oneday_registrations").insert({
      team_name: data.teamName,
      player1_name: data.player1Name,
      player2_name: data.player2Name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      category: data.category,
      level: data.category === "women" ? "intermediate" : (data.level ?? "intermediate"),
      payment_status: data.paymentStatus,
    });
    if (error) {
      if (error.code === "23505") throw new Error("That team name is already registered. Pick another.");
      throw new Error("Could not save your registration. Please try again.");
    }
    return { ok: true as const };
  });

// ------------------------------------------------------------------ admin

export const getOnedaySettingsAdmin = createServerFn({ method: "GET" }).handler(async (): Promise<OnedayInfo> => {
  await admin();
  const s = await readSettings();
  return {
    visible: s?.visible ?? false,
    isOpen: s?.is_open ?? false,
    name: s?.name ?? "",
    eventDate: s?.event_date ?? "",
    venue: s?.venue ?? "",
    paymentDetails: s?.payment_details ?? "",
    menuLabel: s?.menu_label || "One-day",
    maxApproved: s?.max_approved_teams ?? null,
    maxTotal: s?.max_total_registrations ?? null,
  };
});

const settingsSchema = z.object({
  visible: z.boolean(),
  isOpen: z.boolean(),
  name: z.string().trim().min(3, "Name needs at least 3 characters").max(80),
  eventDate: z.string().trim().max(40),
  venue: z.string().trim().max(160),
  paymentDetails: z.string().trim().max(1000),
  menuLabel: z.string().trim().min(1, "Enter a menu name").max(24),
  maxApproved: z.number().int().min(1).max(1000).nullable(),
  maxTotal: z.number().int().min(1).max(1000).nullable(),
});

export const updateOnedaySettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => settingsSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const existing = await readSettings();
    const payload = {
      visible: data.visible,
      is_open: data.isOpen,
      name: data.name,
      event_date: data.eventDate,
      venue: data.venue,
      payment_details: data.paymentDetails,
      menu_label: data.menuLabel,
      max_approved_teams: data.maxApproved,
      max_total_registrations: data.maxTotal,
    };
    const result = existing
      ? await supabase.from("oneday_settings").update(payload).eq("id", existing.id)
      : await supabase.from("oneday_settings").insert(payload);
    if (result.error) throw new Error(result.error.message);
    return { ok: true as const };
  });

export const listOnedayRegistrations = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnedayRegistration[]> => {
    const supabase = await admin();
    const { data, error } = await supabase
      .from("oneday_registrations")
      .select("id, team_name, player1_name, player2_name, email, phone, status, level, payment_status, seen_by_admin, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as OnedayRegistration[];
  },
);

export const setOnedayStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "rejected"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: prev } = await supabase.from("oneday_registrations").select("status").eq("id", data.id).maybeSingle();
    if (data.status === "approved" && prev?.status !== "approved") {
      const s = await readSettings();
      const c = await counts();
      if (s?.max_approved_teams != null && c.approved >= s.max_approved_teams)
        throw new Error(`The approved-team limit (${s.max_approved_teams}) is reached. Raise it in Event settings first.`);
    }
    const { data: reg, error } = await supabase
      .from("oneday_registrations")
      .update({ status: data.status, seen_by_admin: true })
      .eq("id", data.id)
      .select("team_name, email")
      .single();
    if (error) throw new Error(error.message);
    if (data.status !== "pending" && prev?.status !== data.status) {
      const settings = await readSettings();
      const { sendRegistrationStatusEmails } = await import("./registration-status-email.server");
      await sendRegistrationStatusEmails({
        client: supabase,
        status: data.status,
        tournamentName: settings?.name || "One-day badminton tournament",
        teamName: reg.team_name,
        emails: [reg.email],
        key: `oneday-${data.id}`,
      });
    }
    return { ok: true as const };
  });

export const markOnedaySeen = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = await admin();
  const { error } = await supabase.from("oneday_registrations").update({ seen_by_admin: true }).eq("seen_by_admin", false);
  if (error) throw new Error(error.message);
  return { ok: true as const };
});

export const deleteOnedayRegistration = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase.from("oneday_registrations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

async function exportData() {
  const supabase = await admin();
  const s = await readSettings();
  const { data, error } = await supabase
    .from("oneday_registrations")
    .select("team_name, player1_name, player2_name, email, phone, status, level, payment_status, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return { rows: data ?? [], meta: { name: s?.name ?? "", eventDate: s?.event_date ?? "", venue: s?.venue ?? "" } };
}

export const exportOnedayCsv = createServerFn({ method: "POST" }).handler(async () => {
  const { rows } = await exportData();
  const { buildCsv } = await import("./oneday-export.server");
  return { csv: buildCsv(rows) };
});

export const exportOnedayPdf = createServerFn({ method: "POST" }).handler(async () => {
  const { rows, meta } = await exportData();
  const { buildPdf } = await import("./oneday-export.server");
  const bytes = await buildPdf(rows, meta);
  return { base64: Buffer.from(bytes).toString("base64") };
});

export const setOnedayPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), paymentStatus: z.enum(["paid", "unpaid"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase
      .from("oneday_registrations")
      .update({ payment_status: data.paymentStatus })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
