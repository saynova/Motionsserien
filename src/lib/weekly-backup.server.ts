// Server-only: builds the printable PDF backup of scores, standings and the
// next week's schedule, stores it, and emails the admin a download link.

import { computeStandings, type MatchRow, type SlotRow, type TeamRow } from "./tournament";

const MATCH_COLUMNS =
  "id, week_no, division, match_no, team_a_id, team_b_id, court, start_time, status, s1a, s1b, s2a, s2b, s3a, s3b, submitted_by";
const SLOT_COLUMNS = "id, week_no, team_id, division, position, tie_break_adj";

export type SeasonBackupRow = {
  id: string;
  name: string;
  start_monday: string;
  total_weeks: number;
  current_week: number;
  backup_enabled: boolean;
  backup_offset_days: number;
  backup_time: string;
  backup_email: string;
};

const SEASON_COLUMNS =
  "id, name, start_monday, total_weeks, current_week, backup_enabled, backup_offset_days, backup_time, backup_email";

/** "YYYY-MM-DD HH:mm" in Swedish time. */
export function stockholmNow(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(", ", " ");
}

export function mondayOfWeek(startMonday: string, weekNo: number): string {
  const [y = 0, m = 1, d = 1] = startMonday.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + (weekNo - 1) * 7)).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export async function activeBackupSeason(): Promise<SeasonBackupRow> {
  const { adminClient } = await import("./tournament.server");
  const { data, error } = await adminClient()
    .from("seasons")
    .select(SEASON_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No active season found.");
  return data as SeasonBackupRow;
}

/** Latin-1 only: pdf-lib's standard fonts cannot draw other characters. */
function safe(value: string): string {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\xFF]/g, "?");
}

function setScores(match: MatchRow): string {
  const sets: string[] = [];
  if (match.s1a !== null && match.s1b !== null) sets.push(`${match.s1a}-${match.s1b}`);
  if (match.s2a !== null && match.s2b !== null) sets.push(`${match.s2a}-${match.s2b}`);
  if (match.s3a !== null && match.s3b !== null) sets.push(`${match.s3a}-${match.s3b}`);
  return sets.length ? sets.join(", ") : "not played";
}

export type BackupData = {
  season: SeasonBackupRow;
  teams: TeamRow[];
  slots: SlotRow[];
  matches: MatchRow[];
};

export async function loadBackupData(season: SeasonBackupRow): Promise<BackupData> {
  const { adminClient } = await import("./tournament.server");
  const admin = adminClient();
  const [teamsRes, slotsRes, matchesRes] = await Promise.all([
    admin.from("teams").select("id, name, start_division"),
    admin.from("week_slots").select(SLOT_COLUMNS).eq("season_id", season.id),
    admin.from("matches").select(MATCH_COLUMNS).eq("season_id", season.id),
  ]);
  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (slotsRes.error) throw new Error(slotsRes.error.message);
  if (matchesRes.error) throw new Error(matchesRes.error.message);
  return {
    season,
    teams: (teamsRes.data ?? []) as TeamRow[],
    slots: (slotsRes.data ?? []) as SlotRow[],
    matches: (matchesRes.data ?? []) as MatchRow[],
  };
}

/** Builds the full backup PDF: standings, every result, and the next schedule. */
export async function buildBackupPdf(data: BackupData): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.1, 0.12);
  const grey = rgb(0.42, 0.44, 0.48);
  const rule = rgb(0.82, 0.83, 0.86);

  const W = 595.28;
  const H = 841.89;
  const left = 46;
  const right = W - 46;
  let page = pdf.addPage([W, H]);
  let y = H - 56;

  const nameOf = new Map(data.teams.map((t) => [t.id, t.name]));
  const weekNo = data.season.current_week;

  function newPage() {
    page = pdf.addPage([W, H]);
    y = H - 56;
  }

  function need(space: number) {
    if (y - space < 56) newPage();
  }

  function text(
    value: string,
    x: number,
    size = 9.5,
    useBold = false,
    color = ink,
  ) {
    page.drawText(safe(value), { x, y, size, font: useBold ? bold : font, color });
  }

  function heading(value: string) {
    need(40);
    y -= 8;
    page.drawText(safe(value), { x: left, y, size: 13, font: bold, color: ink });
    y -= 6;
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 1,
      color: rule,
    });
    y -= 16;
  }

  function row(cells: Array<[string, number]>, useBold = false, color = ink) {
    need(16);
    for (const [value, x] of cells) text(value, x, 9.5, useBold, color);
    y -= 14;
  }

  // ------------------------------------------------------------------- cover
  page.drawText(safe(data.season.name), { x: left, y, size: 20, font: bold, color: ink });
  y -= 22;
  page.drawText(safe(`Score and schedule backup - week ${weekNo}`), {
    x: left,
    y,
    size: 12,
    font,
    color: grey,
  });
  y -= 16;
  page.drawText(safe(`Created ${stockholmNow()} (Swedish time)`), {
    x: left,
    y,
    size: 9.5,
    font,
    color: grey,
  });
  y -= 10;

  // --------------------------------------------------------------- standings
  const weekSlots = data.slots.filter((s) => s.week_no === weekNo);
  const weekMatches = data.matches.filter((m) => m.week_no === weekNo);
  const standings = computeStandings(weekSlots, weekMatches, data.teams);

  heading(`Standings after week ${weekNo}`);
  const cols = { rank: left, team: left + 32, played: 300, wins: 344, sets: 388, pts: 452, move: 510 };
  row(
    [
      ["#", cols.rank],
      ["Team", cols.team],
      ["P", cols.played],
      ["W", cols.wins],
      ["Sets", cols.sets],
      ["Pts", cols.pts],
      ["Next", cols.move],
    ],
    true,
    grey,
  );
  for (const division of [...standings.keys()].sort((a, b) => a - b)) {
    need(34);
    text(`Division ${division}`, left, 10.5, true);
    y -= 14;
    for (const team of standings.get(division) ?? []) {
      const move = team.movement === "up" ? "up" : team.movement === "down" ? "down" : "stay";
      row([
        [String(team.rank), cols.rank],
        [team.teamName, cols.team],
        [String(team.played), cols.played],
        [String(team.matchWins), cols.wins],
        [`${team.setsWon}-${team.setsLost}`, cols.sets],
        [`${team.pointsFor}-${team.pointsAgainst}`, cols.pts],
        [`Div ${team.nextDivision} (${move})`, cols.move],
      ]);
    }
    y -= 6;
  }

  // -------------------------------------------------------- next week's plan
  const nextMatches = data.matches
    .filter((m) => m.week_no === weekNo + 1)
    .sort((a, b) =>
      a.start_time === b.start_time ? a.court - b.court : a.start_time.localeCompare(b.start_time),
    );
  if (nextMatches.length > 0) {
    heading(`Schedule - week ${weekNo + 1} (Monday ${mondayOfWeek(data.season.start_monday, weekNo + 1)})`);
    row(
      [
        ["Time", left],
        ["Court", left + 54],
        ["Div", left + 104],
        ["Match", left + 148],
      ],
      true,
      grey,
    );
    for (const match of nextMatches) {
      row([
        [match.start_time, left],
        [String(match.court), left + 54],
        [String(match.division), left + 104],
        [
          `${nameOf.get(match.team_a_id) ?? "?"} v ${nameOf.get(match.team_b_id) ?? "?"}`,
          left + 148,
        ],
      ]);
    }
  }

  // ------------------------------------------------------------- all results
  const weeks = [...new Set(data.matches.map((m) => m.week_no))].sort((a, b) => b - a);
  for (const wk of weeks) {
    const rows = data.matches
      .filter((m) => m.week_no === wk)
      .sort((a, b) => (a.division === b.division ? a.match_no - b.match_no : a.division - b.division));
    if (rows.length === 0) continue;
    heading(`Results - week ${wk} (Monday ${mondayOfWeek(data.season.start_monday, wk)})`);
    row(
      [
        ["Div", left],
        ["Court", left + 40],
        ["Time", left + 90],
        ["Match", left + 138],
        ["Sets", 400],
        ["Status", 506],
      ],
      true,
      grey,
    );
    for (const match of rows) {
      row([
        [String(match.division), left],
        [String(match.court), left + 40],
        [match.start_time, left + 90],
        [
          `${nameOf.get(match.team_a_id) ?? "?"} v ${nameOf.get(match.team_b_id) ?? "?"}`,
          left + 138,
        ],
        [setScores(match), 400],
        [match.status, 506],
      ]);
    }
  }

  // page numbers
  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    p.drawText(safe(`${data.season.name} - backup - page ${index + 1} of ${pages.length}`), {
      x: left,
      y: 30,
      size: 8,
      font,
      color: grey,
    });
  });

  return pdf.save();
}

export type BackupFile = { bytes: Uint8Array; fileName: string; weekNo: number };

export async function generateBackupFile(): Promise<BackupFile> {
  const season = await activeBackupSeason();
  const data = await loadBackupData(season);
  const bytes = await buildBackupPdf(data);
  const slug = season.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    bytes,
    fileName: `${slug}-week-${season.current_week}-backup.pdf`,
    weekNo: season.current_week,
  };
}

/** Stores the PDF and returns a long-lived download link. */
async function storeBackup(file: BackupFile): Promise<{ path: string; url: string }> {
  const { adminClient } = await import("./tournament.server");
  const admin = adminClient();
  const path = `${new Date().toISOString().slice(0, 10)}/${file.fileName}`;
  const upload = await admin.storage
    .from("backups")
    .upload(path, file.bytes, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw new Error(upload.error.message);
  const signed = await admin.storage.from("backups").createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signed.error || !signed.data) throw new Error(signed.error?.message ?? "Could not create the link.");
  const { siteDownloadLink } = await import("./account.server");
  return { path, url: siteDownloadLink(signed.data.signedUrl) };
}

export type BackupResult = {
  ran: boolean;
  reason?: string;
  weekNo?: number;
  sentTo?: string;
};

/**
 * Sends the backup email when the admin-configured moment has passed and this
 * week has not been backed up yet. `force` sends immediately (test button).
 */
export async function sendWeeklyBackup(force = false): Promise<BackupResult> {
  const season = await activeBackupSeason();
  if (!force && !season.backup_enabled) {
    return { ran: false, reason: "Automatic backup is switched off." };
  }

  const { adminClient } = await import("./tournament.server");
  const admin = adminClient();
  const weekNo = season.current_week;

  if (!force) {
    const matchDay = mondayOfWeek(season.start_monday, weekNo);
    const due = `${addDays(matchDay, season.backup_offset_days)} ${season.backup_time}`;
    if (stockholmNow() < due) return { ran: false, reason: `Not due yet (${due}).` };

    const already = await admin
      .from("weekly_backups")
      .select("id")
      .eq("season_id", season.id)
      .eq("week_no", weekNo)
      .maybeSingle();
    if (already.data) return { ran: false, reason: `Week ${weekNo} is already backed up.` };
  }

  const data = await loadBackupData(season);
  const bytes = await buildBackupPdf(data);
  const slug = season.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const stored = await storeBackup({
    bytes,
    fileName: `${slug}-week-${weekNo}-backup.pdf`,
    weekNo,
  });

  const finals = data.matches.filter((m) => m.week_no === weekNo && m.status === "final").length;
  const waiting = data.matches.filter((m) => m.week_no === weekNo && m.status !== "final").length;
  const nextWeekMatches = data.matches.filter((m) => m.week_no === weekNo + 1).length;

  // Build and store the player-facing schedule sheet for the upcoming week so
  // it can ride along in the same email. A failure here must not block the backup.
  let scheduleUrl: string | undefined;
  try {
    const { generateScheduleFile, storeSchedule } = await import("./schedule-pdf.server");
    const schedule = await generateScheduleFile();
    scheduleUrl = (await storeSchedule(schedule)).url;
  } catch (error) {
    console.error("Schedule PDF generation failed", error);
  }

  const { getEmailSettings } = await import("./email-settings.server");
  const settings = await getEmailSettings(admin);
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  await sendTemplateEmail("weekly-backup", season.backup_email, {
    templateData: {
      seasonName: season.name,
      weekNo,
      createdAt: stockholmNow(),
      finals,
      waiting,
      nextWeekMatches,
      downloadUrl: stored.url,
      scheduleUrl,
      scheduleWeekNo: weekNo + 1,
      signature: settings.signature,
      footer: settings.footer,
    },
  });

  if (!force) {
    await admin
      .from("weekly_backups")
      .upsert(
        { season_id: season.id, week_no: weekNo, file_path: stored.path, sent_to: season.backup_email },
        { onConflict: "season_id,week_no" },
      );
  }

  return { ran: true, weekNo, sentTo: season.backup_email };
}
