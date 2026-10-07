// Automatic fallback: if the admin has not approved scores and finalised the
// week by 11:00 Stockholm time on the next match Monday (8 hours before the
// 19:00 games), approve all submitted scores, record no-shows as 0-0, and
// generate the next week's divisions and matches.

import {
  buildNextAssignment,
  buildWeekMatches,
  computeStandings,
  NO_SHOW_SCORE,
  type Assignment,
  type MatchRow,
  type SeasonRow,
  type SlotRow,
  type TeamRow,
} from "./tournament";

const MATCH_COLUMNS =
  "id, week_no, division, match_no, team_a_id, team_b_id, court, start_time, status, s1a, s1b, s2a, s2b, s3a, s3b, submitted_by";
const SLOT_COLUMNS = "id, week_no, team_id, division, position, tie_break_adj";
const SEASON_COLUMNS =
  "id, name, start_monday, total_weeks, current_week, is_active, auto_finalize_enabled, auto_finalize_offset_days, auto_finalize_time, auto_approve_enabled, auto_approve_offset_days, auto_approve_time";

/** "YYYY-MM-DD HH:mm" in Swedish time. */
function stockholmNow(): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return parts.replace(", ", " ");
}

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

type Result = {
  ran: boolean;
  reason?: string;
  approved?: number;
  noShows?: number;
  nextWeek?: number | null;
  seasonComplete?: boolean;
  /** Which stages actually did work on this run. */
  scoresApproved?: boolean;
  scheduleGenerated?: boolean;
};

export async function autoFinalizeDueWeek(
  force = false,
  stage: "approve" | "schedule" | "both" = "both",
): Promise<Result> {
  const { adminClient } = await import("./tournament.server");
  const admin = adminClient();

  const seasonResult = await admin
    .from("seasons")
    .select(SEASON_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (seasonResult.error) throw new Error(seasonResult.error.message);
  const season = seasonResult.data as (SeasonRow & {
    auto_finalize_enabled?: boolean;
    auto_finalize_offset_days?: number;
    auto_finalize_time?: string;
    auto_approve_enabled?: boolean;
    auto_approve_offset_days?: number;
    auto_approve_time?: string;
  }) | null;
  if (!season) return { ran: false, reason: "No active season." };

  const weekNo = season.current_week;
  const now = stockholmNow();
  const matchMonday = mondayOfWeek(season.start_monday, weekNo);

  // Two independent stages, each with its own admin-configured day and time.
  const approveEnabled = season.auto_approve_enabled !== false;
  const approveDeadline = `${addDays(matchMonday, season.auto_approve_offset_days ?? 2)} ${
    season.auto_approve_time ?? "10:00"
  }`;
  const approveDue =
    stage !== "schedule" && (force || (approveEnabled && now >= approveDeadline));

  const scheduleEnabled = season.auto_finalize_enabled !== false;
  const scheduleDeadline = `${addDays(matchMonday, season.auto_finalize_offset_days ?? 7)} ${
    season.auto_finalize_time ?? "11:00"
  }`;
  const scheduleDue =
    stage !== "approve" && (force || (scheduleEnabled && now >= scheduleDeadline));

  if (!approveDue && !scheduleDue) {
    if (!approveEnabled && !scheduleEnabled) {
      return { ran: false, reason: "Automatic updates are switched off." };
    }
    return {
      ran: false,
      reason: `Not due yet (score approval ${approveEnabled ? approveDeadline : "off"}, schedule ${
        scheduleEnabled ? scheduleDeadline : "off"
      }).`,
    };
  }

  const [teamsRes, slotsRes, matchesRes] = await Promise.all([
    admin.from("teams").select("id, name, start_division"),
    admin.from("week_slots").select(SLOT_COLUMNS).eq("season_id", season.id).eq("week_no", weekNo),
    admin.from("matches").select(MATCH_COLUMNS).eq("season_id", season.id).eq("week_no", weekNo),
  ]);
  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (slotsRes.error) throw new Error(slotsRes.error.message);
  if (matchesRes.error) throw new Error(matchesRes.error.message);

  const teams = (teamsRes.data ?? []) as TeamRow[];
  const slots = (slotsRes.data ?? []) as SlotRow[];
  const matches = (matchesRes.data ?? []) as MatchRow[];
  if (matches.length === 0) return { ran: false, reason: "No matches for this week." };

  const stamp = new Date().toISOString();

  // Stage 1 — score approval. Runs at its own deadline; the schedule stage also
  // needs final scores, so it triggers this stage too when it runs first.
  let pending: MatchRow[] = [];
  let noShows: MatchRow[] = [];

  if (approveDue || scheduleDue) {
    // Approve every submitted score that is still waiting.
    pending = matches.filter((m) => m.status === "pending");
    if (pending.length > 0) {
      const { error } = await admin
        .from("matches")
        .update({ status: "final", approved_at: stamp })
        .in(
          "id",
          pending.map((m) => m.id),
        );
      if (error) throw new Error(error.message);
      for (const match of pending) match.status = "final";
    }

    // Matches with no score at all count as a 0-0 no-show.
    noShows = matches.filter((m) => m.status === "scheduled");
    if (noShows.length > 0) {
      const { error } = await admin
        .from("matches")
        .update({ status: "final", ...NO_SHOW_SCORE, approved_at: stamp })
        .in(
          "id",
          noShows.map((m) => m.id),
        );
      if (error) throw new Error(error.message);
      for (const match of noShows) {
        match.status = "final";
        match.s1a = 0;
        match.s1b = 0;
        match.s2a = 0;
        match.s2b = 0;
      }
    }
  }

  // Stage 2 — promotion/relegation and next week's schedule.
  if (!scheduleDue) {
    return {
      ran: true,
      approved: pending.length,
      noShows: noShows.length,
      scoresApproved: true,
      scheduleGenerated: false,
      nextWeek: null,
      reason: scheduleEnabled
        ? `Schedule generation not due yet (${scheduleDeadline}).`
        : "Automatic schedule generation is switched off.",
    };
  }

  const standings = computeStandings(slots, matches, teams);
  const assignment = buildNextAssignment(standings);

  if (weekNo >= season.total_weeks) {
    return {
      ran: true,
      approved: pending.length,
      noShows: noShows.length,
      scoresApproved: true,
      scheduleGenerated: false,
      nextWeek: null,
      seasonComplete: true,
    };
  }

  await writeWeek(admin, season.id, weekNo + 1, assignment);
  const bump = await admin
    .from("seasons")
    .update({ current_week: weekNo + 1 })
    .eq("id", season.id);
  if (bump.error) throw new Error(bump.error.message);

  return {
    ran: true,
    approved: pending.length,
    noShows: noShows.length,
    scoresApproved: true,
    scheduleGenerated: true,
    nextWeek: weekNo + 1,
    seasonComplete: false,
  };
}

async function writeWeek(
  admin: ReturnType<typeof import("./tournament.server").adminClient>,
  seasonId: string,
  weekNo: number,
  assignment: Assignment[],
) {
  await admin.from("matches").delete().eq("season_id", seasonId).eq("week_no", weekNo);
  await admin.from("week_slots").delete().eq("season_id", seasonId).eq("week_no", weekNo);

  const slotRows = assignment.map((a) => ({
    season_id: seasonId,
    week_no: weekNo,
    team_id: a.teamId,
    division: a.division,
    position: a.position,
  }));
  const slotInsert = await admin.from("week_slots").insert(slotRows);
  if (slotInsert.error) throw new Error(slotInsert.error.message);

  const matchRows = buildWeekMatches(assignment).map((m) => ({
    season_id: seasonId,
    week_no: weekNo,
    ...m,
    status: "scheduled" as const,
  }));
  const matchInsert = await admin.from("matches").insert(matchRows);
  if (matchInsert.error) throw new Error(matchInsert.error.message);
}
