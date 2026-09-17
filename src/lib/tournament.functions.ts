import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

import {
  buildNextAssignment,
  buildWeekMatches,
  computeStandings,
  NO_SHOW_SCORE,
  validateScore,
  type Assignment,
  type MatchRow,
  type ScoreInput,
  type SeasonRow,
  type SlotRow,
  type TeamRow,
  type TournamentSnapshot,
} from "./tournament";

type AdminSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "mssn-admin",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function requireAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.unlocked) throw new Error("Admin sign-in required.");
}

// ---------------------------------------------------------------- public read

const MATCH_COLUMNS =
  "id, week_no, division, match_no, team_a_id, team_b_id, court, start_time, status, s1a, s1b, s2a, s2b, s3a, s3b, submitted_by";
const SLOT_COLUMNS = "id, week_no, team_id, division, position, tie_break_adj";
const SEASON_COLUMNS = "id, name, start_monday, total_weeks, current_week, is_active";

export const getTournament = createServerFn({ method: "GET" }).handler(
  async (): Promise<TournamentSnapshot> => {
    const { readClient } = await import("./tournament.server");
    const supabase = readClient();

    const seasonResult = await supabase
      .from("seasons")
      .select(SEASON_COLUMNS)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (seasonResult.error) throw new Error(seasonResult.error.message);
    const season = seasonResult.data as SeasonRow | null;
    if (!season) throw new Error("No active season found.");

    const [teamsResult, slotsResult, matchesResult] = await Promise.all([
      supabase.from("teams").select("id, name, start_division").order("name"),
      supabase.from("week_slots").select(SLOT_COLUMNS).eq("season_id", season.id),
      supabase.from("matches").select(MATCH_COLUMNS).eq("season_id", season.id),
    ]);
    if (teamsResult.error) throw new Error(teamsResult.error.message);
    if (slotsResult.error) throw new Error(slotsResult.error.message);
    if (matchesResult.error) throw new Error(matchesResult.error.message);

    return {
      season,
      teams: (teamsResult.data ?? []) as TeamRow[],
      slots: (slotsResult.data ?? []) as SlotRow[],
      matches: (matchesResult.data ?? []) as MatchRow[],
    };
  },
);

// -------------------------------------------------------------- score submit

type SubmitInput = {
  matchId: string;
  submittedBy: string;
  s1a: number;
  s1b: number;
  s2a: number;
  s2b: number;
  s3a: number | null;
  s3b: number | null;
};

function toScore(input: SubmitInput | AdminScoreInput): ScoreInput {
  return {
    s1a: input.s1a,
    s1b: input.s1b,
    s2a: input.s2a,
    s2b: input.s2b,
    s3a: input.s3a,
    s3b: input.s3b,
  };
}

export const ALREADY_SUBMITTED_MESSAGE =
  "This match score has already been submitted and is awaiting approval. If you need to make changes, please contact the General through contact form from this website only";

export const submitScore = createServerFn({ method: "POST" })
  .inputValidator((data: SubmitInput) => {
    if (typeof data?.matchId !== "string" || data.matchId.length < 10) {
      throw new Error("Pick a match first.");
    }
    const name = (data.submittedBy ?? "").trim();
    if (name.length < 2 || name.length > 60) {
      throw new Error("Enter your name (2–60 characters).");
    }
    const error = validateScore(toScore(data));
    if (error) throw new Error(error);
    return { ...data, submittedBy: name };
  })
  .handler(async ({ data }) => {
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();

    const existing = await supabase
      .from("matches")
      .select("id, status")
      .eq("id", data.matchId)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (!existing.data) throw new Error("That match no longer exists.");
    if (existing.data.status === "final") {
      throw new Error("That match is already final. Ask an admin to change it.");
    }
    if (existing.data.status === "pending") {
      throw new Error(ALREADY_SUBMITTED_MESSAGE);
    }

    const { error } = await supabase
      .from("matches")
      .update({
        status: "pending",
        s1a: data.s1a,
        s1b: data.s1b,
        s2a: data.s2a,
        s2b: data.s2b,
        s3a: data.s3a,
        s3b: data.s3b,
        submitted_by: data.submittedBy,
        submitted_at: new Date().toISOString(),
        approved_at: null,
      })
      .eq("id", data.matchId);
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });

// ------------------------------------------------------------------ admin gate

export const getAdminStatus = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { unlocked: session.data.unlocked === true };
});

export const adminSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => {
    if (typeof data?.password !== "string" || data.password.length === 0) {
      throw new Error("Enter the admin password.");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) throw new Error("Admin password is not configured.");
    if (!passwordMatches(data.password, expected)) return { ok: false as const };
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const adminSignOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

// --------------------------------------------------------------- admin actions

export const approveMatches = createServerFn({ method: "POST" })
  .inputValidator((data: { matchIds: string[] }) => {
    if (!Array.isArray(data?.matchIds) || data.matchIds.length === 0) {
      throw new Error("Nothing to approve.");
    }
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error, count } = await adminClient()
      .from("matches")
      .update({ status: "final", approved_at: new Date().toISOString() }, { count: "exact" })
      .in("id", data.matchIds)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { approved: count ?? 0 };
  });

export const approveAllPending = createServerFn({ method: "POST" })
  .inputValidator((data: { weekNo: number | null }) => data ?? { weekNo: null })
  .handler(async ({ data }) => {
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    let query = adminClient()
      .from("matches")
      .update({ status: "final", approved_at: new Date().toISOString() }, { count: "exact" })
      .eq("status", "pending");
    if (typeof data.weekNo === "number") query = query.eq("week_no", data.weekNo);
    const { error, count } = await query;
    if (error) throw new Error(error.message);
    return { approved: count ?? 0 };
  });

export const rejectMatch = createServerFn({ method: "POST" })
  .inputValidator((data: { matchId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient()
      .from("matches")
      .update({
        status: "scheduled",
        s1a: null,
        s1b: null,
        s2a: null,
        s2b: null,
        s3a: null,
        s3b: null,
        submitted_by: null,
        submitted_at: null,
        approved_at: null,
      })
      .eq("id", data.matchId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

type AdminScoreInput = {
  matchId: string;
  s1a: number;
  s1b: number;
  s2a: number;
  s2b: number;
  s3a: number | null;
  s3b: number | null;
};

export const setMatchScore = createServerFn({ method: "POST" })
  .inputValidator((data: AdminScoreInput) => {
    const error = validateScore(toScore(data), true);
    if (error) throw new Error(error);
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient()
      .from("matches")
      .update({
        status: "final",
        s1a: data.s1a,
        s1b: data.s1b,
        s2a: data.s2a,
        s2b: data.s2b,
        s3a: data.s3a,
        s3b: data.s3b,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.matchId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const markNoShow = createServerFn({ method: "POST" })
  .inputValidator((data: { matchId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient()
      .from("matches")
      .update({
        status: "final",
        ...NO_SHOW_SCORE,
        submitted_by: null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.matchId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setTieBreak = createServerFn({ method: "POST" })
  .inputValidator((data: { slotId: string; value: number }) => {
    if (!Number.isInteger(data?.value) || Math.abs(data.value) > 999) {
      throw new Error("Tie-break adjustment must be a whole number.");
    }
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient()
      .from("week_slots")
      .update({ tie_break_adj: data.value })
      .eq("id", data.slotId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// --------------------------------------------- finalise week / generate next

async function loadWeek(seasonId: string, weekNo: number) {
  const { adminClient } = await import("./tournament.server");
  const supabase = adminClient();
  const [teams, slots, matches] = await Promise.all([
    supabase.from("teams").select("id, name, start_division"),
    supabase
      .from("week_slots")
      .select(SLOT_COLUMNS)
      .eq("season_id", seasonId)
      .eq("week_no", weekNo),
    supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .eq("season_id", seasonId)
      .eq("week_no", weekNo),
  ]);
  if (teams.error) throw new Error(teams.error.message);
  if (slots.error) throw new Error(slots.error.message);
  if (matches.error) throw new Error(matches.error.message);
  return {
    supabase,
    teams: (teams.data ?? []) as TeamRow[],
    slots: (slots.data ?? []) as SlotRow[],
    matches: (matches.data ?? []) as MatchRow[],
  };
}

async function writeWeek(
  supabase: Awaited<ReturnType<typeof import("./tournament.server").adminClient>>,
  seasonId: string,
  weekNo: number,
  assignment: Assignment[],
) {
  await supabase.from("matches").delete().eq("season_id", seasonId).eq("week_no", weekNo);
  await supabase.from("week_slots").delete().eq("season_id", seasonId).eq("week_no", weekNo);

  const slotRows = assignment.map((a) => ({
    season_id: seasonId,
    week_no: weekNo,
    team_id: a.teamId,
    division: a.division,
    position: a.position,
  }));
  const slotInsert = await supabase.from("week_slots").insert(slotRows);
  if (slotInsert.error) throw new Error(slotInsert.error.message);

  const matchRows = buildWeekMatches(assignment).map((m) => ({
    season_id: seasonId,
    week_no: weekNo,
    ...m,
    status: "scheduled" as const,
  }));
  const matchInsert = await supabase.from("matches").insert(matchRows);
  if (matchInsert.error) throw new Error(matchInsert.error.message);
}

export const finalizeWeek = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
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
  const season = seasonResult.data as SeasonRow | null;
  if (!season) throw new Error("No active season found.");

  const weekNo = season.current_week;
  const { supabase, teams, slots, matches } = await loadWeek(season.id, weekNo);

  const pending = matches.filter((m) => m.status === "pending");
  if (pending.length > 0) {
    throw new Error(
      `${pending.length} submitted score${pending.length === 1 ? "" : "s"} still need approving or rejecting first.`,
    );
  }

  // Teams that never submitted a score get 0–0.
  const noShows = matches.filter((m) => m.status === "scheduled");
  if (noShows.length > 0) {
    const { error } = await supabase
      .from("matches")
      .update({ status: "final", ...NO_SHOW_SCORE, approved_at: new Date().toISOString() })
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

  const standings = computeStandings(slots, matches, teams);
  const assignment = buildNextAssignment(standings);

  if (weekNo >= season.total_weeks) {
    return {
      seasonComplete: true as const,
      noShows: noShows.length,
      nextWeek: null,
    };
  }

  await writeWeek(supabase, season.id, weekNo + 1, assignment);
  const bump = await supabase
    .from("seasons")
    .update({ current_week: weekNo + 1 })
    .eq("id", season.id);
  if (bump.error) throw new Error(bump.error.message);

  return { seasonComplete: false as const, noShows: noShows.length, nextWeek: weekNo + 1 };
});

/**
 * Rebuilds the current week's divisions and matches from the previous week's
 * final results. Refuses when any match of the current week already has a score.
 */
export const regenerateCurrentWeek = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
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
  const season = seasonResult.data as SeasonRow | null;
  if (!season) throw new Error("No active season found.");

  const weekNo = season.current_week;
  if (weekNo <= 1) {
    throw new Error("Week 1 has no previous week to rebuild from.");
  }

  const current = await loadWeek(season.id, weekNo);
  const touched = current.matches.filter((m) => m.status !== "scheduled");
  if (touched.length > 0) {
    throw new Error(
      `Week ${weekNo} already has ${touched.length} result${touched.length === 1 ? "" : "s"} entered, so it cannot be rebuilt.`,
    );
  }

  const previous = await loadWeek(season.id, weekNo - 1);
  const standings = computeStandings(previous.slots, previous.matches, previous.teams);
  const assignment = buildNextAssignment(standings);
  if (assignment.length === 0) {
    throw new Error(`Week ${weekNo - 1} has no results to rebuild from.`);
  }

  await writeWeek(current.supabase, season.id, weekNo, assignment);
  return { ok: true as const, weekNo };
});

export const startNewSeason = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; startMonday: string }) => {
    const name = (data?.name ?? "").trim();
    if (name.length < 3 || name.length > 60) throw new Error("Season name must be 3–60 characters.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data?.startMonday ?? "")) {
      throw new Error("Pick a starting Monday.");
    }
    return { name, startMonday: data.startMonday };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
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
    const season = seasonResult.data as SeasonRow | null;
    if (!season) throw new Error("No active season found.");

    const { slots, matches, teams } = await loadWeek(season.id, season.current_week);
    if (matches.some((m) => m.status !== "final")) {
      throw new Error("Finalise the last week before starting a new season.");
    }

    const standings = computeStandings(slots, matches, teams);
    const assignment = buildNextAssignment(standings);

    const closeOld = await admin
      .from("seasons")
      .update({ is_active: false })
      .eq("id", season.id);
    if (closeOld.error) throw new Error(closeOld.error.message);

    const created = await admin
      .from("seasons")
      .insert({
        name: data.name,
        start_monday: data.startMonday,
        total_weeks: season.total_weeks,
        current_week: 1,
        is_active: true,
      })
      .select("id")
      .single();
    if (created.error) throw new Error(created.error.message);

    await writeWeek(admin, created.data.id, 1, assignment);
    return { ok: true as const, seasonId: created.data.id };
  });
