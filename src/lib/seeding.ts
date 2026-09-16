import { DIVISION_COUNT, TEAMS_PER_DIVISION } from "./tournament";

export type SeedEntry = { teamName: string; division: number; position: number };

export type SeedCandidate = { teamName: string; preferredDivision: number | null };

export const TOTAL_SLOTS = DIVISION_COUNT * TEAMS_PER_DIVISION;

/** Build a 10x3 board from candidates, honouring preferred divisions where possible. */
export function suggestSeedBoard(candidates: SeedCandidate[]): SeedEntry[] {
  const board = new Map<string, string>(); // `${division}-${position}` -> team
  const key = (d: number, p: number) => `${d}-${p}`;

  const freePosition = (division: number): number | null => {
    for (let p = 1; p <= TEAMS_PER_DIVISION; p += 1) {
      if (!board.has(key(division, p))) return p;
    }
    return null;
  };

  const place = (teamName: string, division: number): boolean => {
    const position = freePosition(division);
    if (position === null) return false;
    board.set(key(division, position), teamName);
    return true;
  };

  const withPreference = candidates
    .filter((c) => c.preferredDivision !== null)
    .sort((a, b) => (a.preferredDivision ?? 0) - (b.preferredDivision ?? 0));
  const withoutPreference = candidates.filter((c) => c.preferredDivision === null);

  const leftovers: string[] = [];

  for (const candidate of withPreference) {
    const wanted = Math.min(Math.max(candidate.preferredDivision ?? 1, 1), DIVISION_COUNT);
    if (place(candidate.teamName, wanted)) continue;
    let placed = false;
    for (let offset = 1; offset < DIVISION_COUNT && !placed; offset += 1) {
      const down = wanted + offset;
      const up = wanted - offset;
      if (down <= DIVISION_COUNT && place(candidate.teamName, down)) placed = true;
      else if (up >= 1 && place(candidate.teamName, up)) placed = true;
    }
    if (!placed) leftovers.push(candidate.teamName);
  }

  // New teams (and any leftovers) fill remaining slots from the bottom division up.
  const rest = [...withoutPreference.map((c) => c.teamName), ...leftovers];
  for (const teamName of rest) {
    let placed = false;
    for (let d = DIVISION_COUNT; d >= 1 && !placed; d -= 1) {
      if (place(teamName, d)) placed = true;
    }
    if (!placed) break; // board is full
  }

  const entries: SeedEntry[] = [];
  for (let d = 1; d <= DIVISION_COUNT; d += 1) {
    for (let p = 1; p <= TEAMS_PER_DIVISION; p += 1) {
      const teamName = board.get(key(d, p));
      if (teamName) entries.push({ teamName, division: d, position: p });
    }
  }
  return entries;
}

export type BoardIssue = string;

export function validateSeedBoard(entries: SeedEntry[], expectedTeams: string[]): BoardIssue[] {
  const issues: BoardIssue[] = [];
  const seen = new Map<string, number>();
  for (const entry of entries) {
    const lower = entry.teamName.toLowerCase();
    seen.set(lower, (seen.get(lower) ?? 0) + 1);
  }
  for (const [name, count] of seen) {
    if (count > 1) issues.push(`${name} is placed ${count} times.`);
  }
  for (let d = 1; d <= DIVISION_COUNT; d += 1) {
    const count = entries.filter((e) => e.division === d).length;
    if (count !== TEAMS_PER_DIVISION) {
      issues.push(`Division ${d} has ${count} teams (needs ${TEAMS_PER_DIVISION}).`);
    }
  }
  const placed = new Set(entries.map((e) => e.teamName.toLowerCase()));
  for (const team of expectedTeams) {
    if (!placed.has(team.toLowerCase())) issues.push(`${team} is not placed yet.`);
  }
  return issues;
}
