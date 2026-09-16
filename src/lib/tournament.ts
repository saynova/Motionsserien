// Shared, browser-safe tournament rules for Motionsserien HT-26.

export const DIVISION_COUNT = 10;
export const TEAMS_PER_DIVISION = 3;
export const MATCH_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 2],
  [2, 3],
  [1, 3],
];

export type MatchStatus = "scheduled" | "pending" | "final";

export type TeamRow = {
  id: string;
  name: string;
  start_division: number;
};

export type SlotRow = {
  id: string;
  week_no: number;
  team_id: string;
  division: number;
  position: number;
  tie_break_adj: number;
};

export type MatchRow = {
  id: string;
  week_no: number;
  division: number;
  match_no: number;
  team_a_id: string;
  team_b_id: string;
  court: number;
  start_time: string;
  status: MatchStatus;
  s1a: number | null;
  s1b: number | null;
  s2a: number | null;
  s2b: number | null;
  s3a: number | null;
  s3b: number | null;
  submitted_by: string | null;
};

export type SeasonRow = {
  id: string;
  name: string;
  start_monday: string;
  total_weeks: number;
  current_week: number;
  is_active: boolean;
};

export type TournamentSnapshot = {
  season: SeasonRow;
  teams: TeamRow[];
  slots: SlotRow[];
  matches: MatchRow[];
};

export type Movement = "up" | "stay" | "down";

export type StandingRow = {
  teamId: string;
  teamName: string;
  division: number;
  position: number;
  played: number;
  matchWins: number;
  setsWon: number;
  setsLost: number;
  setDiff: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  tieBreakAdj: number;
  rank: number;
  movement: Movement;
  nextDivision: number;
};

export type ScoreInput = {
  s1a: number;
  s1b: number;
  s2a: number;
  s2b: number;
  s3a: number | null;
  s3b: number | null;
};

/** Court used by a division. Divisions 1-5 at 19:00, 6-10 at 20:00. */
export function courtForDivision(division: number): number {
  return division <= 5 ? division : division - 5;
}

export function sessionForDivision(division: number): "19:00" | "20:00" {
  return division <= 5 ? "19:00" : "20:00";
}

/** Start time for match slot index 0/1/2 within a division. */
export function startTimeFor(division: number, slotIndex: number): string {
  const hour = division <= 5 ? 19 : 20;
  const minutes = [0, 20, 40][slotIndex] ?? 0;
  return `${hour}:${String(minutes).padStart(2, "0")}`;
}

export function weekDate(startMonday: string, weekNo: number): Date {
  const base = new Date(`${startMonday}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + (weekNo - 1) * 7);
  return base;
}

export function formatWeekDate(startMonday: string, weekNo: number): string {
  return weekDate(startMonday, weekNo).toISOString().slice(0, 10);
}

function setWinner(a: number | null, b: number | null): "a" | "b" | null {
  if (a == null || b == null) return null;
  if (a > b) return "a";
  if (b > a) return "b";
  return null;
}

export function matchSets(match: MatchRow): Array<{ a: number; b: number }> {
  const sets: Array<{ a: number; b: number }> = [];
  if (match.s1a != null && match.s1b != null) sets.push({ a: match.s1a, b: match.s1b });
  if (match.s2a != null && match.s2b != null) sets.push({ a: match.s2a, b: match.s2b });
  if (match.s3a != null && match.s3b != null) sets.push({ a: match.s3a, b: match.s3b });
  return sets;
}

export function matchSetsWon(match: MatchRow): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const s of matchSets(match)) {
    const w = setWinner(s.a, s.b);
    if (w === "a") a += 1;
    if (w === "b") b += 1;
  }
  return { a, b };
}

/** Winning team id, or null for a no-show / unplayed match. */
export function matchWinnerId(match: MatchRow): string | null {
  const { a, b } = matchSetsWon(match);
  if (a === b) return null;
  return a > b ? match.team_a_id : match.team_b_id;
}

export function formatScore(match: MatchRow): string {
  const sets = matchSets(match);
  if (sets.length === 0) return "—";
  return sets.map((s) => `${s.a}–${s.b}`).join("  ");
}

export function isNoShow(match: MatchRow): boolean {
  return (
    match.status === "final" &&
    matchSets(match).length > 0 &&
    matchSets(match).every((s) => s.a === 0 && s.b === 0)
  );
}

export function nextDivisionFor(division: number, rank: number): number {
  if (rank === 1) return Math.max(1, division - 1);
  if (rank === 3) return Math.min(DIVISION_COUNT, division + 1);
  return division;
}

export function movementFor(division: number, rank: number): Movement {
  const next = nextDivisionFor(division, rank);
  if (next < division) return "up";
  if (next > division) return "down";
  return "stay";
}

/**
 * Division standings for one week. Only matches marked final count.
 * Order: match wins > set difference > point difference > points for > tie-break adjustment.
 */
export function computeStandings(
  slots: SlotRow[],
  matches: MatchRow[],
  teams: TeamRow[],
): Map<number, StandingRow[]> {
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const byDivision = new Map<number, StandingRow[]>();

  const divisions = [...new Set(slots.map((s) => s.division))].sort((a, b) => a - b);

  for (const division of divisions) {
    const divisionSlots = slots
      .filter((s) => s.division === division)
      .sort((a, b) => a.position - b.position);

    const rows = divisionSlots.map<StandingRow>((slot) => ({
      teamId: slot.team_id,
      teamName: teamName.get(slot.team_id) ?? "Unknown team",
      division,
      position: slot.position,
      played: 0,
      matchWins: 0,
      setsWon: 0,
      setsLost: 0,
      setDiff: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      tieBreakAdj: slot.tie_break_adj,
      rank: 0,
      movement: "stay",
      nextDivision: division,
    }));

    const index = new Map(rows.map((r) => [r.teamId, r]));

    for (const match of matches) {
      if (match.division !== division || match.status !== "final") continue;
      const a = index.get(match.team_a_id);
      const b = index.get(match.team_b_id);
      if (!a || !b) continue;

      const sets = matchSets(match);
      const won = matchSetsWon(match);

      a.played += 1;
      b.played += 1;
      a.setsWon += won.a;
      a.setsLost += won.b;
      b.setsWon += won.b;
      b.setsLost += won.a;

      for (const s of sets) {
        a.pointsFor += s.a;
        a.pointsAgainst += s.b;
        b.pointsFor += s.b;
        b.pointsAgainst += s.a;
      }

      const winner = matchWinnerId(match);
      if (winner === a.teamId) a.matchWins += 1;
      if (winner === b.teamId) b.matchWins += 1;
    }

    for (const row of rows) {
      row.setDiff = row.setsWon - row.setsLost;
      row.pointDiff = row.pointsFor - row.pointsAgainst;
    }

    rows.sort(
      (x, y) =>
        y.matchWins - x.matchWins ||
        y.setDiff - x.setDiff ||
        y.pointDiff - x.pointDiff ||
        y.pointsFor - x.pointsFor ||
        y.tieBreakAdj - x.tieBreakAdj ||
        x.position - y.position,
    );

    rows.forEach((row, i) => {
      row.rank = i + 1;
      row.movement = movementFor(division, row.rank);
      row.nextDivision = nextDivisionFor(division, row.rank);
    });

    byDivision.set(division, rows);
  }

  return byDivision;
}

export type Assignment = { teamId: string; division: number; position: number };

/**
 * Promotion / relegation. Within a new division the order is:
 * relegated from above, then the team that stayed, then promoted from below.
 */
export function buildNextAssignment(standings: Map<number, StandingRow[]>): Assignment[] {
  type Entry = { teamId: string; category: number; oldRank: number; oldDivision: number };
  const buckets = new Map<number, Entry[]>();

  for (const [division, rows] of standings) {
    for (const row of rows) {
      const target = row.nextDivision;
      const category = target < division ? 2 : target > division ? 0 : 1;
      const list = buckets.get(target) ?? [];
      list.push({ teamId: row.teamId, category, oldRank: row.rank, oldDivision: division });
      buckets.set(target, list);
    }
  }

  const result: Assignment[] = [];
  for (const [division, entries] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    entries.sort((a, b) => a.category - b.category || a.oldRank - b.oldRank);
    entries.forEach((entry, i) => {
      result.push({ teamId: entry.teamId, division, position: i + 1 });
    });
  }
  return result;
}

export type PlannedMatch = {
  division: number;
  match_no: number;
  team_a_id: string;
  team_b_id: string;
  court: number;
  start_time: string;
};

export function buildWeekMatches(assignment: Assignment[]): PlannedMatch[] {
  const byDivision = new Map<number, Assignment[]>();
  for (const slot of assignment) {
    const list = byDivision.get(slot.division) ?? [];
    list.push(slot);
    byDivision.set(slot.division, list);
  }

  const matches: PlannedMatch[] = [];
  for (const [division, slots] of [...byDivision.entries()].sort((a, b) => a[0] - b[0])) {
    const byPosition = new Map(slots.map((s) => [s.position, s.teamId]));
    MATCH_PAIRS.forEach(([pa, pb], i) => {
      const teamA = byPosition.get(pa);
      const teamB = byPosition.get(pb);
      if (!teamA || !teamB) return;
      matches.push({
        division,
        match_no: i + 1,
        team_a_id: teamA,
        team_b_id: teamB,
        court: courtForDivision(division),
        start_time: startTimeFor(division, i),
      });
    });
  }
  return matches;
}

/** Validates a best-of-three result. Returns an error message, or null when valid. */
export function validateScore(score: ScoreInput, allowNoShow = false): string | null {
  const values = [score.s1a, score.s1b, score.s2a, score.s2b];
  if (values.some((v) => !Number.isInteger(v) || v < 0 || v > 99)) {
    return "Set scores must be whole numbers between 0 and 99.";
  }

  const allZero =
    values.every((v) => v === 0) && score.s3a == null && score.s3b == null;
  if (allZero) {
    return allowNoShow ? null : "Enter the real set scores. A 0–0 result can only be set by an admin.";
  }

  const checkSet = (a: number, b: number, target: number, label: string): string | null => {
    if (a === b) return `${label} cannot end level at ${a}–${b}.`;
    const winner = Math.max(a, b);
    if (winner < target) return `${label} must be won with at least ${target} points.`;
    return null;
  };

  const set1 = checkSet(score.s1a, score.s1b, 21, "Set 1");
  if (set1) return set1;
  const set2 = checkSet(score.s2a, score.s2b, 21, "Set 2");
  if (set2) return set2;

  const a1 = score.s1a > score.s1b;
  const a2 = score.s2a > score.s2b;
  const split = a1 !== a2;

  const hasThird = score.s3a != null && score.s3b != null;

  if (!split && hasThird) {
    return "Set 3 is only played when the first two sets are split 1–1.";
  }
  if (split && !hasThird) {
    return "The first two sets are split 1–1, so Set 3 is required.";
  }
  if (hasThird) {
    const a3 = score.s3a as number;
    const b3 = score.s3b as number;
    if (![a3, b3].every((v) => Number.isInteger(v) && v >= 0 && v <= 30)) {
      return "Set 3 scores must be whole numbers between 0 and 30.";
    }
    if (Math.max(a3, b3) > 11) return "Set 3 is played to 11 points only.";
    const set3 = checkSet(a3, b3, 11, "Set 3");
    if (set3) return set3;
  }

  return null;
}

export const NO_SHOW_SCORE: ScoreInput = {
  s1a: 0,
  s1b: 0,
  s2a: 0,
  s2b: 0,
  s3a: null,
  s3b: null,
};
