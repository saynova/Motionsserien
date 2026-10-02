// Server-only: builds the clean, player-facing PDF of the upcoming week's
// schedule — the sheet the General can forward to players when the site is
// unreachable. Separate from the full season backup PDF.

import type { MatchRow, TeamPlayerRow, TeamRow } from "./tournament";
import { mondayOfWeek, stockholmNow, type SeasonBackupRow } from "./weekly-backup.server";

const MATCH_COLUMNS =
  "id, week_no, division, match_no, team_a_id, team_b_id, court, start_time, status, s1a, s1b, s2a, s2b, s3a, s3b, submitted_by";

export type ScheduleData = {
  season: SeasonBackupRow;
  weekNo: number;
  teams: TeamRow[];
  teamPlayers: TeamPlayerRow[];
  matches: MatchRow[];
};

/** Loads the matches of `weekNo` together with team and player names. */
export async function loadScheduleData(
  season: SeasonBackupRow,
  weekNo: number,
): Promise<ScheduleData> {
  const { adminClient } = await import("./tournament.server");
  const admin = adminClient();
  const [teamsRes, playersRes, matchesRes] = await Promise.all([
    admin.from("teams").select("id, name, start_division"),
    admin.from("team_players").select("team_id, player_no, name"),
    admin.from("matches").select(MATCH_COLUMNS).eq("season_id", season.id).eq("week_no", weekNo),
  ]);
  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);
  if (matchesRes.error) throw new Error(matchesRes.error.message);
  return {
    season,
    weekNo,
    teams: (teamsRes.data ?? []) as TeamRow[],
    teamPlayers: (playersRes.data ?? []) as TeamPlayerRow[],
    matches: (matchesRes.data ?? []) as MatchRow[],
  };
}

/** The next week that has matches scheduled, or null when the season is over. */
export async function upcomingScheduleWeek(season: SeasonBackupRow): Promise<number | null> {
  const { adminClient } = await import("./tournament.server");
  const { data, error } = await adminClient()
    .from("matches")
    .select("week_no")
    .eq("season_id", season.id)
    .gt("week_no", season.current_week)
    .order("week_no", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data.week_no as number) : null;
}

/** Latin-1 only: pdf-lib's standard fonts cannot draw other characters. */
function safe(value: string): string {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\xFF]/g, "?");
}

/** "Monday 5 October 2026" from a YYYY-MM-DD date. */
function longDate(isoDate: string): string {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Builds the one-week schedule PDF. */
export async function buildSchedulePdf(data: ScheduleData): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.1, 0.1, 0.12);
  const grey = rgb(0.42, 0.44, 0.48);
  const rule = rgb(0.82, 0.83, 0.86);
  const brand = rgb(0.29, 0.32, 0.85);
  const band = rgb(0.965, 0.968, 0.985);
  const headerFill = rgb(0.14, 0.15, 0.2);
  const white = rgb(1, 1, 1);

  const W = 595.28;
  const H = 841.89;
  const left = 46;
  const right = W - 46;
  const ROW_H = 27;
  const FOOTER_TOP = 64;

  const nameOf = new Map(data.teams.map((t) => [t.id, t.name]));
  const playersOf = new Map<string, string[]>();
  for (const player of data.teamPlayers) {
    const list = playersOf.get(player.team_id) ?? [];
    list[player.player_no - 1] = player.name;
    playersOf.set(player.team_id, list);
  }
  const playersLine = (teamId: string) =>
    (playersOf.get(teamId) ?? []).filter(Boolean).join(" & ");

  const matches = [...data.matches].sort((a, b) =>
    a.start_time === b.start_time
      ? a.division === b.division
        ? a.match_no - b.match_no
        : a.division - b.division
      : a.start_time.localeCompare(b.start_time),
  );
  // Matches run in 20-minute slots inside two one-hour sessions: divisions
  // 1-5 from 19:00, divisions 6-10 from 20:00.
  const sessionDivisions = new Map<string, number[]>();
  for (const match of matches) {
    const session = match.division <= 5 ? "19:00" : "20:00";
    const list = sessionDivisions.get(session) ?? [];
    if (!list.includes(match.division)) list.push(match.division);
    sessionDivisions.set(session, list);
  }
  const sessions = [...sessionDivisions.keys()].sort();

  const colTime = left + 12;
  const colDiv = left + 74;
  const colCourt = left + 132;
  const colMatch = left + 186;

  let page = pdf.addPage([W, H]);
  let y = H - 56;

  // ------------------------------------------------------------------ header
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: brand });
  page.drawText(safe(data.season.name), { x: left, y, size: 19, font: bold, color: ink });
  y -= 21;
  page.drawText(safe(`Match schedule - week ${data.weekNo}`), {
    x: left,
    y,
    size: 12.5,
    font: bold,
    color: brand,
  });
  y -= 16;
  page.drawText(safe(`${longDate(mondayOfWeek(data.season.start_monday, data.weekNo))} · Rackethallen, Ludvika`), {
    x: left,
    y,
    size: 10,
    font,
    color: grey,
  });
  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rule });
  y -= 18;

  // ----------------------------------------------------------------- session
  for (const time of sessions) {
    const end = `${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:${time.slice(3)}`;
    const divisions = (sessionDivisions.get(time) ?? []).sort((a, b) => a - b);
    page.drawText(
      safe(`${time}-${end}  ·  Divisions ${divisions.join(", ")}  ·  Courts 1-5`),
      { x: left, y, size: 10.5, font: bold, color: ink },
    );
    y -= 15;
  }
  y -= 8;

  // ------------------------------------------------------------------- table
  function tableHeader() {
    page.drawRectangle({ x: left, y: y - 7, width: right - left, height: 20, color: headerFill });
    const hy = y - 1;
    page.drawText("TIME", { x: colTime, y: hy, size: 8, font: bold, color: white });
    page.drawText("DIV", { x: colDiv, y: hy, size: 8, font: bold, color: white });
    page.drawText("COURT", { x: colCourt, y: hy, size: 8, font: bold, color: white });
    page.drawText("MATCH", { x: colMatch, y: hy, size: 8, font: bold, color: white });
    y -= 22;
  }

  function newPage() {
    page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: brand });
    y = H - 48;
    page.drawText(safe(`${data.season.name} - week ${data.weekNo} schedule (continued)`), {
      x: left,
      y,
      size: 11,
      font: bold,
      color: ink,
    });
    y -= 18;
    tableHeader();
  }

  tableHeader();
  matches.forEach((match, index) => {
    if (y - ROW_H < FOOTER_TOP) newPage();
    if (index % 2 === 0) {
      page.drawRectangle({ x: left, y: y - ROW_H + 7, width: right - left, height: ROW_H, color: band });
    }
    const teamA = nameOf.get(match.team_a_id) ?? "?";
    const teamB = nameOf.get(match.team_b_id) ?? "?";
    const playersA = playersLine(match.team_a_id);
    const playersB = playersLine(match.team_b_id);
    page.drawText(safe(match.start_time), { x: colTime, y: y - 2, size: 10, font: bold, color: ink });
    page.drawText(safe(String(match.division)), { x: colDiv, y: y - 2, size: 10, font, color: ink });
    page.drawText(safe(String(match.court)), { x: colCourt, y: y - 2, size: 10, font, color: ink });
    page.drawText(safe(`${teamA}  v  ${teamB}`), { x: colMatch, y: y - 2, size: 10, font: bold, color: ink });
    const players = [playersA, playersB].filter(Boolean).join("   ·   ");
    if (players) {
      page.drawText(safe(players), { x: colMatch, y: y - 13, size: 8, font, color: grey });
    }
    y -= ROW_H;
  });

  // ------------------------------------------------------------------ footer
  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    p.drawLine({ start: { x: left, y: 56 }, end: { x: right, y: 56 }, thickness: 0.75, color: rule });
    p.drawText(safe("Please arrive 10 minutes before your match starts."), {
      x: left,
      y: 44,
      size: 8.5,
      font: bold,
      color: ink,
    });
    p.drawText(
      safe(`Questions? Contact the General - Md Rabiul Islam · www.motionsserien.se/ask · Created ${stockholmNow()} (Swedish time)`),
      { x: left, y: 33, size: 8, font, color: grey },
    );
    p.drawText(safe(`Page ${index + 1} of ${pages.length}`), {
      x: right - 60,
      y: 33,
      size: 8,
      font,
      color: grey,
    });
  });

  return pdf.save();
}

export type ScheduleFile = { bytes: Uint8Array; fileName: string; weekNo: number };

/** Builds the upcoming week's schedule PDF for the active season. */
export async function generateScheduleFile(): Promise<ScheduleFile> {
  const { activeBackupSeason } = await import("./weekly-backup.server");
  const season = await activeBackupSeason();
  const weekNo = (await upcomingScheduleWeek(season)) ?? season.current_week;
  const data = await loadScheduleData(season, weekNo);
  const bytes = await buildSchedulePdf(data);
  const slug = season.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { bytes, fileName: `${slug}-week-${weekNo}-schedule.pdf`, weekNo };
}

/** Stores the schedule PDF and returns a long-lived download link. */
export async function storeSchedule(file: ScheduleFile): Promise<{ path: string; url: string }> {
  const { adminClient } = await import("./tournament.server");
  const admin = adminClient();
  const path = `${new Date().toISOString().slice(0, 10)}/${file.fileName}`;
  const upload = await admin.storage
    .from("backups")
    .upload(path, file.bytes, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw new Error(upload.error.message);
  const signed = await admin.storage.from("backups").createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signed.error || !signed.data) {
    throw new Error(signed.error?.message ?? "Could not create the link.");
  }
  const { siteDownloadLink } = await import("./account.server");
  return { path, url: siteDownloadLink(signed.data.signedUrl) };
}
