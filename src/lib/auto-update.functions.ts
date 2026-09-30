import { createServerFn } from "@tanstack/react-start";

export type AutoUpdateSettings = {
  /** Score auto-approval stage. */
  approveEnabled: boolean;
  approveOffsetDays: number;
  approveTime: string;
  /** Next score approval run in Swedish time, or null when off. */
  approveNextRun: string | null;
  /** Next week schedule generation stage. */
  enabled: boolean;
  offsetDays: number;
  time: string;
  /** Next automatic run in Swedish time, "YYYY-MM-DD HH:mm", or null when off. */
  nextRun: string | null;
  currentWeek: number;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Monday date (YYYY-MM-DD) on which the given week's matches are played. */
function mondayOfWeek(startMonday: string, weekNo: number): string {
  const [y = 0, m = 1, d = 1] = startMonday.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + (weekNo - 1) * 7));
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export const getAutoUpdateSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<AutoUpdateSettings> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();
    const season = await supabase
      .from("seasons")
      .select(
        "id, start_monday, current_week, auto_finalize_enabled, auto_finalize_offset_days, auto_finalize_time",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (season.error) throw new Error(season.error.message);
    if (!season.data) throw new Error("No active season found.");

    const row = season.data;
    const matchDay = mondayOfWeek(row.start_monday, row.current_week);
    const nextRun = row.auto_finalize_enabled
      ? `${addDays(matchDay, row.auto_finalize_offset_days)} ${row.auto_finalize_time}`
      : null;

    return {
      enabled: row.auto_finalize_enabled,
      offsetDays: row.auto_finalize_offset_days,
      time: row.auto_finalize_time,
      nextRun,
      currentWeek: row.current_week,
    };
  },
);

export const saveAutoUpdateSettings = createServerFn({ method: "POST" })
  .inputValidator((data: { enabled: boolean; offsetDays: number; time: string }) => {
    const offsetDays = Number(data?.offsetDays);
    if (!Number.isInteger(offsetDays) || offsetDays < 0 || offsetDays > 13) {
      throw new Error("Choose a day between match day and 13 days after.");
    }
    const time = String(data?.time ?? "").trim();
    if (!TIME_PATTERN.test(time)) throw new Error("Enter a time such as 11:00.");
    return { enabled: Boolean(data?.enabled), offsetDays, time };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();
    const season = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (season.error) throw new Error(season.error.message);
    if (!season.data) throw new Error("No active season found.");
    const { error } = await supabase
      .from("seasons")
      .update({
        auto_finalize_enabled: data.enabled,
        auto_finalize_offset_days: data.offsetDays,
        auto_finalize_time: data.time,
      })
      .eq("id", season.data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type ReminderSettings = {
  enabled: boolean;
  offsetDays: number;
  time: string;
  nextRun: string | null;
};

export const getReminderSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReminderSettings> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const season = await adminClient()
      .from("seasons")
      .select("start_monday, current_week, reminder_enabled, reminder_offset_days, reminder_time")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (season.error) throw new Error(season.error.message);
    if (!season.data) throw new Error("No active season found.");
    const row = season.data;
    const matchDay = mondayOfWeek(row.start_monday, row.current_week);
    const hour = row.reminder_time.slice(0, 2);
    return {
      enabled: row.reminder_enabled,
      offsetDays: row.reminder_offset_days,
      time: row.reminder_time,
      nextRun: row.reminder_enabled
        ? `${addDays(matchDay, row.reminder_offset_days)} ${hour}:10`
        : null,
    };
  },
);

export const saveReminderSettings = createServerFn({ method: "POST" })
  .inputValidator((data: { enabled: boolean; offsetDays: number; time: string }) => {
    const offsetDays = Number(data?.offsetDays);
    if (!Number.isInteger(offsetDays) || offsetDays < 0 || offsetDays > 13) {
      throw new Error("Choose a day between match day and 13 days after.");
    }
    const time = String(data?.time ?? "").trim();
    if (!TIME_PATTERN.test(time)) throw new Error("Enter a time such as 12:00.");
    return { enabled: Boolean(data?.enabled), offsetDays, time: `${time.slice(0, 2)}:00` };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();
    const season = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (season.error) throw new Error(season.error.message);
    if (!season.data) throw new Error("No active season found.");
    const { error } = await supabase
      .from("seasons")
      .update({
        reminder_enabled: data.enabled,
        reminder_offset_days: data.offsetDays,
        reminder_time: data.time,
      })
      .eq("id", season.data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
