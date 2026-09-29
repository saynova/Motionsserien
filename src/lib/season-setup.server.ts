// Server-only helpers for creating a season from a seeding board.
import { buildWeekMatches, DIVISION_COUNT, TEAMS_PER_DIVISION, type Assignment } from "./tournament";
import type { adminClient } from "./tournament.server";

type Admin = ReturnType<typeof adminClient>;

export const MAX_TEAMS = DIVISION_COUNT * TEAMS_PER_DIVISION;

/**
 * Closes registration automatically once the tournament is full (30 teams).
 * The admin can always reopen it from the admin console.
 */
export async function closeRegistrationIfFull(
  supabase: Admin,
  targetSeason: string,
): Promise<{ count: number; closed: boolean }> {
  const counted = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("target_season", targetSeason)
    .in("status", ["pending", "accepted", "waitlisted"]);
  if (counted.error) throw new Error(counted.error.message);
  const count = counted.count ?? 0;
  if (count < MAX_TEAMS) return { count, closed: false };

  const settings = await supabase
    .from("registration_settings")
    .select("id, is_open")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (settings.error) throw new Error(settings.error.message);
  if (settings.data?.is_open) {
    const upd = await supabase
      .from("registration_settings")
      .update({ is_open: false })
      .eq("id", settings.data.id);
    if (upd.error) throw new Error(upd.error.message);
  }
  return { count, closed: true };
}


export async function writeWeekPlan(
  supabase: Admin,
  seasonId: string,
  weekNo: number,
  assignment: Assignment[],
) {
  await supabase.from("matches").delete().eq("season_id", seasonId).eq("week_no", weekNo);
  await supabase.from("week_slots").delete().eq("season_id", seasonId).eq("week_no", weekNo);

  const slotInsert = await supabase.from("week_slots").insert(
    assignment.map((a) => ({
      season_id: seasonId,
      week_no: weekNo,
      team_id: a.teamId,
      division: a.division,
      position: a.position,
    })),
  );
  if (slotInsert.error) throw new Error(slotInsert.error.message);

  const matchInsert = await supabase.from("matches").insert(
    buildWeekMatches(assignment).map((m) => ({
      season_id: seasonId,
      week_no: weekNo,
      ...m,
      status: "scheduled" as const,
    })),
  );
  if (matchInsert.error) throw new Error(matchInsert.error.message);
}

/** Returns team ids for the given names, creating any team that does not exist yet. */
export async function ensureTeams(
  supabase: Admin,
  names: Array<{ name: string; division: number }>,
): Promise<Map<string, string>> {
  const existing = await supabase.from("teams").select("id, name");
  if (existing.error) throw new Error(existing.error.message);
  const byName = new Map<string, string>();
  for (const team of existing.data ?? []) {
    byName.set(team.name.toLowerCase(), team.id);
  }

  const missing = names.filter((n) => !byName.has(n.name.toLowerCase()));
  if (missing.length > 0) {
    const created = await supabase
      .from("teams")
      .insert(missing.map((m) => ({ name: m.name, start_division: m.division })))
      .select("id, name");
    if (created.error) throw new Error(created.error.message);
    for (const team of created.data ?? []) {
      byName.set(team.name.toLowerCase(), team.id);
    }
  }
  return byName;
}
