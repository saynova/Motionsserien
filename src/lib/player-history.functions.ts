import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HistoryMatch = {
  id: string;
  week: number;
  date: string;
  opponent: string;
  score: string;
  result: "Won" | "Lost" | "Draw";
  noShow: boolean;
};

export type TournamentHistory = {
  seasonId: string;
  seasonName: string;
  isActive: boolean;
  finished: boolean;
  teamName: string;
  players: string[];
  startDivision: number | null;
  finalDivision: number | null;
  finalRank: number | null;
  bestDivision: number | null;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  achievements: string[];
  matches: HistoryMatch[];
};

export const getMyHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TournamentHistory[]> => {
    const { adminClient } = await import("./tournament.server");
    const { computeStandings, matchSets, matchWinnerId, isNoShow, formatWeekDate } = await import("./tournament");
    const db = adminClient();
    const user = await db.auth.admin.getUserById(context.userId);
    const email = (user.data.user?.email ?? "").toLowerCase();

    // Teams the player belongs to: by team roster email and by account-linked registrations.
    const [rosters, links, teamRows] = await Promise.all([
      email ? db.from("team_players").select("team_id").ilike("email", email) : Promise.resolve({ data: [], error: null }),
      db.from("account_links").select("season_key, registration_id").eq("user_id", context.userId),
      db.from("teams").select("id, name, start_division"),
    ]);
    const allTeams = teamRows.data ?? [];
    const myTeamIds = new Set((rosters.data ?? []).map((r) => r.team_id));
    const regIds = (links.data ?? []).map((l) => l.registration_id);
    if (regIds.length) {
      const regs = await db.from("registrations").select("team_name").in("id", regIds).eq("status", "accepted");
      const names = new Set((regs.data ?? []).map((r) => r.team_name.toLowerCase()));
      for (const t of allTeams) if (names.has(t.name.toLowerCase())) myTeamIds.add(t.id);
    }
    if (!myTeamIds.size) return [];
    const ids = [...myTeamIds];

    const mySlots = await db.from("week_slots").select("season_id").in("team_id", ids);
    const seasonIds = [...new Set((mySlots.data ?? []).map((s) => s.season_id))];
    if (!seasonIds.length) return [];

    const [seasons, players, champs, supportRow] = await Promise.all([
      db.from("seasons").select("id, name, start_monday, total_weeks, current_week, is_active, created_at").in("id", seasonIds),
      db.from("team_players").select("team_id, player_no, name").in("team_id", ids),
      db.from("champions").select("team_name, season_title"),
      db.from("site_support_settings").select("season_finished").limit(1).maybeSingle(),
    ]);
    const teamName = new Map(allTeams.map((t) => [t.id, t.name]));
    const out: TournamentHistory[] = [];

    for (const season of seasons.data ?? []) {
      const [slotRows, matchRows] = await Promise.all([
        db.from("week_slots").select("id, week_no, team_id, division, position, tie_break_adj").eq("season_id", season.id),
        db.from("matches").select("id, week_no, division, match_no, team_a_id, team_b_id, court, start_time, status, s1a, s1b, s2a, s2b, s3a, s3b, submitted_by").eq("season_id", season.id),
      ]);
      const slots = slotRows.data ?? [];
      const matches = (matchRows.data ?? []) as import("./tournament").MatchRow[];
      const teamId = ids.find((id) => slots.some((s) => s.team_id === id));
      if (!teamId) continue;

      const mine = slots.filter((s) => s.team_id === teamId).sort((a, b) => a.week_no - b.week_no);
      const lastWeek = season.current_week;
      const standings = computeStandings(
        slots.filter((s) => s.week_no === lastWeek),
        matches.filter((m) => m.week_no <= lastWeek),
        allTeams,
      );
      const row = [...standings.values()].flat().find((r) => r.teamId === teamId) ?? null;

      const finals = matches
        .filter((m) => m.status === "final" && (m.team_a_id === teamId || m.team_b_id === teamId))
        .sort((a, b) => b.week_no - a.week_no);
      let setsWon = 0;
      let setsLost = 0;
      const list: HistoryMatch[] = finals.map((m) => {
        const isA = m.team_a_id === teamId;
        const sets = matchSets(m);
        for (const s of sets) {
          const f = isA ? s.a : s.b;
          const g = isA ? s.b : s.a;
          if (f > g) setsWon++;
          else if (g > f) setsLost++;
        }
        const w = matchWinnerId(m);
        return {
          id: m.id,
          week: m.week_no,
          date: formatWeekDate(season.start_monday, m.week_no),
          opponent: teamName.get(isA ? m.team_b_id : m.team_a_id) ?? "Unknown team",
          score: sets.length ? sets.map((s) => (isA ? `${s.a}–${s.b}` : `${s.b}–${s.a}`)).join("  ") : "0–0",
          result: w === teamId ? "Won" : w === null ? "Draw" : "Lost",
          noShow: isNoShow(m),
        };
      });
      const wins = list.filter((m) => m.result === "Won").length;
      const losses = list.filter((m) => m.result === "Lost").length;

      const finished = !season.is_active || (season.current_week >= season.total_weeks && supportRow.data?.season_finished === true);
      const startDivision = mine[0]?.division ?? null;
      const finalDivision = row?.division ?? mine.at(-1)?.division ?? null;
      const bestDivision = mine.length ? Math.min(...mine.map((s) => s.division)) : null;
      const name = teamName.get(teamId) ?? "";

      const achievements: string[] = [];
      const champ = (champs.data ?? []).some(
        (c) => c.team_name.toLowerCase() === name.toLowerCase() && c.season_title.toLowerCase().includes(season.name.toLowerCase()),
      );
      if (champ || (finished && finalDivision === 1 && row?.rank === 1)) achievements.push("🏆 Tournament champion");
      else if (finished && row?.rank === 1) achievements.push(`🥇 Division ${finalDivision} winner`);
      if (startDivision && bestDivision && bestDivision < startDivision)
        achievements.push(`⬆️ Climbed ${startDivision - bestDivision} division${startDivision - bestDivision > 1 ? "s" : ""}`);
      if (bestDivision === 1) achievements.push("⭐ Reached Division 1");
      if (list.length >= 3 && losses === 0 && wins > 0) achievements.push("🛡️ Unbeaten");
      if (list.length >= 3 && !list.some((m) => m.noShow)) achievements.push("✅ Played every match");
      if (list.length && wins / list.length >= 0.75 && losses > 0) achievements.push(`🔥 ${Math.round((wins / list.length) * 100)}% win rate`);

      out.push({
        seasonId: season.id,
        seasonName: season.name,
        isActive: season.is_active,
        finished,
        teamName: name,
        players: (players.data ?? [])
          .filter((p) => p.team_id === teamId)
          .sort((a, b) => a.player_no - b.player_no)
          .map((p) => p.name),
        startDivision,
        finalDivision,
        finalRank: row?.rank ?? null,
        bestDivision,
        played: list.length,
        wins,
        losses,
        setsWon,
        setsLost,
        achievements,
        matches: list,
      });
      void season.created_at;
    }
    return out.sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.seasonName.localeCompare(a.seasonName));
  });
