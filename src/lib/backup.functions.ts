import { createServerFn } from "@tanstack/react-start";

export type BackupSettings = {
  enabled: boolean;
  offsetDays: number;
  time: string;
  email: string;
  /** Next automatic backup in Swedish time, "YYYY-MM-DD HH:mm", or null when off. */
  nextRun: string | null;
  currentWeek: number;
  lastSent: string | null;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getBackupSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<BackupSettings> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { activeBackupSeason, mondayOfWeek, addDays } = await import("./weekly-backup.server");
    const { adminClient } = await import("./tournament.server");
    const season = await activeBackupSeason();

    const last = await adminClient()
      .from("weekly_backups")
      .select("week_no, created_at")
      .eq("season_id", season.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const matchDay = mondayOfWeek(season.start_monday, season.current_week);
    return {
      enabled: season.backup_enabled,
      offsetDays: season.backup_offset_days,
      time: season.backup_time,
      email: season.backup_email,
      nextRun: season.backup_enabled
        ? `${addDays(matchDay, season.backup_offset_days)} ${season.backup_time}`
        : null,
      currentWeek: season.current_week,
      lastSent: last.data
        ? `week ${last.data.week_no} on ${String(last.data.created_at).slice(0, 16).replace("T", " ")}`
        : null,
    };
  },
);

export const saveBackupSettings = createServerFn({ method: "POST" })
  .inputValidator((data: { enabled: boolean; offsetDays: number; time: string; email: string }) => {
    const offsetDays = Number(data?.offsetDays);
    if (!Number.isInteger(offsetDays) || offsetDays < 0 || offsetDays > 13) {
      throw new Error("Choose a day between match day and 13 days after.");
    }
    const time = String(data?.time ?? "").trim();
    if (!TIME_PATTERN.test(time)) throw new Error("Enter a time such as 22:30.");
    const email = String(data?.email ?? "").trim();
    if (!EMAIL_PATTERN.test(email)) throw new Error("Enter a valid email address.");
    return { enabled: Boolean(data?.enabled), offsetDays, time, email };
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
        backup_enabled: data.enabled,
        backup_offset_days: data.offsetDays,
        backup_time: data.time,
        backup_email: data.email,
      })
      .eq("id", season.data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Sends the backup email right now, ignoring the schedule. */
export const sendBackupNow = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const { sendWeeklyBackup } = await import("./weekly-backup.server");
  return sendWeeklyBackup(true);
});

/** Returns the current backup PDF as base64 so the admin can download it in-page. */
export const downloadBackupNow = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const { generateBackupFile } = await import("./weekly-backup.server");
  const file = await generateBackupFile();
  let binary = "";
  for (const byte of file.bytes) binary += String.fromCharCode(byte);
  return { fileName: file.fileName, base64: btoa(binary) };
});

/** Returns the upcoming week's player-facing schedule PDF as base64. */
export const downloadScheduleNow = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const { generateScheduleFile } = await import("./schedule-pdf.server");
  const file = await generateScheduleFile();
  let binary = "";
  for (const byte of file.bytes) binary += String.fromCharCode(byte);
  return { fileName: file.fileName, base64: btoa(binary), weekNo: file.weekNo };
});
