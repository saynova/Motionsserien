import { createServerFn } from "@tanstack/react-start";

import { suggestSeedBoard, type SeedCandidate, type SeedEntry } from "./seeding";
import {
  buildNextAssignment,
  computeStandings,
  DIVISION_COUNT,
  TEAMS_PER_DIVISION,
  type MatchRow,
  type SeasonRow,
  type SlotRow,
  type TeamRow,
} from "./tournament";

export type RegistrationStatus = "pending" | "accepted" | "waitlisted" | "rejected";

export type Registration = {
  id: string;
  target_season: string;
  team_name: string;
  player1_name: string;
  player1_email: string;
  player2_name: string;
  player2_email: string;
  phone: string;
  previous_division: number | null;
  status: string;
  created_at: string;
};

export type RegisteredTeam = {
  team_name: string;
  division: number | null;
  player1_name: string;
  player2_name: string;
};

export type RegistrationInfo = {
  isOpen: boolean;
  targetSeason: string;
  paymentDetails: string;
  seasonName: string;
};

const REG_COLUMNS =
  "id, target_season, team_name, player1_name, player1_email, player2_name, player2_email, phone, previous_division, status, created_at";
const SEED_COLUMNS = "id, target_season, team_name, division, position";

function cleanText(value: unknown, min: number, max: number, label: string): string {
  const text = String(value ?? "").trim();
  if (text.length < min || text.length > max) {
    throw new Error(`${label} must be ${min}–${max} characters.`);
  }
  return text;
}

function cleanEmail(value: unknown, label: string): string {
  const email = String(value ?? "").trim().toLowerCase();
  if (email.length < 5 || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${label} must be a valid email address.`);
  }
  return email;
}

function cleanDivision(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || value === "new") return null;
  const division = Number(value);
  if (!Number.isInteger(division) || division < 1 || division > DIVISION_COUNT) {
    throw new Error(`Previous division must be between 1 and ${DIVISION_COUNT}.`);
  }
  return division;
}

// ---------------------------------------------------------------- public read

export const getRegistrationInfo = createServerFn({ method: "GET" }).handler(
  async (): Promise<RegistrationInfo> => {
    // payment_details is not publicly readable, so read it server-side.
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();
    const [settings, season] = await Promise.all([
      supabase
        .from("registration_settings")
        .select("is_open, target_season")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("seasons")
        .select("name, payment_details")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (settings.error) throw new Error(settings.error.message);
    if (season.error) throw new Error(season.error.message);
    return {
      isOpen: settings.data?.is_open === true,
      targetSeason: settings.data?.target_season ?? "",
      paymentDetails: season.data?.payment_details ?? "",
      seasonName: season.data?.name ?? "",
    };
  },
);

export const getRegisteredTeams = createServerFn({ method: "GET" }).handler(
  async (): Promise<RegisteredTeam[]> => {
    // Team name, division and both player names are public for approved teams;
    // emails and phone numbers stay private.
    const { adminClient } = await import("./tournament.server");
    const { data, error } = await adminClient()
      .from("registrations")
      .select("team_name, previous_division, player1_name, player2_name")
      .eq("status", "accepted")
      .order("team_name", { ascending: true });
    if (error) throw new Error(error.message);
    const teams = ((data ?? []) as Array<{
      team_name: string;
      previous_division: number | null;
      player1_name: string;
      player2_name: string;
    }>).map((r) => ({
      team_name: r.team_name,
      division: r.previous_division,
      player1_name: r.player1_name,
      player2_name: r.player2_name,
    }));
    return ((data ?? []) as RegisteredTeam[]).sort((a, b) => {
      const da = a.division ?? 99;
      const db = b.division ?? 99;
      if (da !== db) return da - db;
      return a.team_name.localeCompare(b.team_name);
    });
  },
);

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      teamName: string;
      player1Name: string;
      player1Email: string;
      player2Name: string;
      player2Email: string;
      phone: string;
      previousDivision: number | null | string;
    }) => ({
      teamName: cleanText(data?.teamName, 2, 60, "Team name"),
      player1Name: cleanText(data?.player1Name, 2, 60, "Player 1 name"),
      player1Email: cleanEmail(data?.player1Email, "Player 1 email"),
      player2Name: cleanText(data?.player2Name, 2, 60, "Player 2 name"),
      player2Email: cleanEmail(data?.player2Email, "Player 2 email"),
      phone: String(data?.phone ?? "").trim().slice(0, 40),
      previousDivision: cleanDivision(data?.previousDivision),
    }),
  )
  .handler(async ({ data }) => {
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();

    const settings = await supabase
      .from("registration_settings")
      .select("is_open, target_season")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (settings.error) throw new Error(settings.error.message);
    if (settings.data?.is_open !== true) throw new Error("Registration is closed right now.");

    const targetSeason = settings.data?.target_season ?? "";
    const { error } = await supabase.from("registrations").insert({
      target_season: targetSeason,
      team_name: data.teamName,
      player1_name: data.player1Name,
      player1_email: data.player1Email,
      player2_name: data.player2Name,
      player2_email: data.player2Email,
      phone: data.phone,
      previous_division: data.previousDivision,
      status: "pending",
    });
    if (error) {
      if (error.code === "23505" || error.code === "23U05" || /duplicate/i.test(error.message)) {
        throw new Error("That team name is already registered for this season.");
      }
      throw new Error(error.message);
    }
    return { ok: true as const };
  });

// --------------------------------------------------------------------- admin

export const listRegistrations = createServerFn({ method: "GET" }).handler(
  async (): Promise<Registration[]> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { data, error } = await adminClient()
      .from("registrations")
      .select(REG_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Registration[];
  },
);

export const setRegistrationStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: RegistrationStatus }) => {
    const allowed: RegistrationStatus[] = ["pending", "accepted", "waitlisted", "rejected"];
    if (!allowed.includes(data?.status)) throw new Error("Unknown status.");
    return { id: String(data?.id ?? ""), status: data.status };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient()
      .from("registrations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteRegistration = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient().from("registrations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setRegistrationOpen = createServerFn({ method: "POST" })
  .inputValidator((data: { isOpen: boolean; targetSeason: string }) => ({
    isOpen: data?.isOpen === true,
    targetSeason: String(data?.targetSeason ?? "").trim().slice(0, 60),
  }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();
    const existing = await supabase
      .from("registration_settings")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    const payload = { is_open: data.isOpen, target_season: data.targetSeason };
    const result = existing.data
      ? await supabase.from("registration_settings").update(payload).eq("id", existing.data.id)
      : await supabase.from("registration_settings").insert(payload);
    if (result.error) throw new Error(result.error.message);
    return { ok: true as const };
  });

export const updateSeasonSettings = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; paymentDetails: string }) => ({
    name: cleanText(data?.name, 3, 60, "Tournament name"),
    paymentDetails: String(data?.paymentDetails ?? "").trim().slice(0, 1000),
  }))
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
      .update({ name: data.name, payment_details: data.paymentDetails })
      .eq("id", season.data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

async function loadSeedContext() {
  const { adminClient } = await import("./tournament.server");
  const supabase = adminClient();

  const settings = await supabase
    .from("registration_settings")
    .select("is_open, target_season")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (settings.error) throw new Error(settings.error.message);
  const targetSeason = settings.data?.target_season ?? "";

  const [regs, seeds] = await Promise.all([
    supabase.from("registrations").select(REG_COLUMNS).eq("status", "accepted"),
    supabase.from("season_seeds").select(SEED_COLUMNS).eq("target_season", targetSeason),
  ]);
  if (regs.error) throw new Error(regs.error.message);
  if (seeds.error) throw new Error(seeds.error.message);

  return {
    supabase,
    targetSeason,
    accepted: (regs.data ?? []) as Registration[],
    seeds: ((seeds.data ?? []) as Array<{ team_name: string; division: number; position: number }>)
      .map((s) => ({ teamName: s.team_name, division: s.division, position: s.position }))
      .sort((a, b) => a.division - b.division || a.position - b.position),
  };
}

export type SeedBoardResult = {
  targetSeason: string;
  accepted: Array<{ teamName: string; previousDivision: number | null }>;
  entries: SeedEntry[];
  slotsNeeded: number;
};

export const getSeedBoard = createServerFn({ method: "GET" }).handler(
  async (): Promise<SeedBoardResult> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { targetSeason, accepted, seeds } = await loadSeedContext();
    return {
      targetSeason,
      accepted: accepted.map((r) => ({
        teamName: r.team_name,
        previousDivision: r.previous_division,
      })),
      entries: seeds,
      slotsNeeded: DIVISION_COUNT * TEAMS_PER_DIVISION,
    };
  },
);

export const buildSeedSuggestion = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const { supabase, targetSeason, accepted } = await loadSeedContext();

  // Divisions earned by returning teams in the active season's latest week.
  const earned = new Map<string, number>();
  const season = await supabase
    .from("seasons")
    .select("id, name, start_monday, total_weeks, current_week, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (season.error) throw new Error(season.error.message);
  const active = season.data as SeasonRow | null;
  if (active) {
    const [teams, slots, matches] = await Promise.all([
      supabase.from("teams").select("id, name, start_division"),
      supabase
        .from("week_slots")
        .select("id, week_no, team_id, division, position, tie_break_adj")
        .eq("season_id", active.id)
        .eq("week_no", active.current_week),
      supabase
        .from("matches")
        .select(
          "id, week_no, division, match_no, team_a_id, team_b_id, court, start_time, status, s1a, s1b, s2a, s2b, s3a, s3b, submitted_by",
        )
        .eq("season_id", active.id)
        .eq("week_no", active.current_week),
    ]);
    if (teams.error) throw new Error(teams.error.message);
    if (slots.error) throw new Error(slots.error.message);
    if (matches.error) throw new Error(matches.error.message);

    const teamRows = (teams.data ?? []) as TeamRow[];
    const standings = computeStandings(
      (slots.data ?? []) as SlotRow[],
      (matches.data ?? []) as MatchRow[],
      teamRows,
    );
    const assignment = buildNextAssignment(standings);
    const nameById = new Map(teamRows.map((t) => [t.id, t.name]));
    for (const a of assignment) {
      const name = nameById.get(a.teamId);
      if (name) earned.set(name.toLowerCase(), a.division);
    }
  }

  const candidates: SeedCandidate[] = accepted.map((r) => ({
    teamName: r.team_name,
    preferredDivision:
      earned.get(r.team_name.toLowerCase()) ?? (r.previous_division ?? null),
  }));

  const entries = suggestSeedBoard(candidates);
  await saveSeedEntries(supabase, targetSeason, entries);
  return { entries, targetSeason };
});

async function saveSeedEntries(
  supabase: Awaited<ReturnType<typeof loadSeedContext>>["supabase"],
  targetSeason: string,
  entries: SeedEntry[],
) {
  const wipe = await supabase.from("season_seeds").delete().eq("target_season", targetSeason);
  if (wipe.error) throw new Error(wipe.error.message);
  if (entries.length === 0) return;
  const insert = await supabase.from("season_seeds").insert(
    entries.map((e) => ({
      target_season: targetSeason,
      team_name: e.teamName,
      division: e.division,
      position: e.position,
    })),
  );
  if (insert.error) throw new Error(insert.error.message);
}

export const saveSeedBoard = createServerFn({ method: "POST" })
  .inputValidator((data: { entries: SeedEntry[] }) => {
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    for (const entry of entries) {
      if (
        typeof entry?.teamName !== "string" ||
        entry.teamName.trim().length < 2 ||
        !Number.isInteger(entry.division) ||
        entry.division < 1 ||
        entry.division > DIVISION_COUNT ||
        !Number.isInteger(entry.position) ||
        entry.position < 1 ||
        entry.position > TEAMS_PER_DIVISION
      ) {
        throw new Error("Invalid seeding board.");
      }
    }
    return { entries };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabase, targetSeason } = await loadSeedContext();
    await saveSeedEntries(supabase, targetSeason, data.entries);
    return { ok: true as const };
  });

export const lockSeedingAndStartSeason = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; startMonday: string }) => {
    const name = cleanText(data?.name, 3, 60, "Season name");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data?.startMonday ?? ""))) {
      throw new Error("Pick a starting Monday.");
    }
    return { name, startMonday: String(data.startMonday) };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabase, targetSeason, accepted, seeds } = await loadSeedContext();

    if (seeds.length !== DIVISION_COUNT * TEAMS_PER_DIVISION) {
      throw new Error(
        `The seeding board needs ${DIVISION_COUNT * TEAMS_PER_DIVISION} teams (currently ${seeds.length}).`,
      );
    }
    for (let d = 1; d <= DIVISION_COUNT; d += 1) {
      if (seeds.filter((s) => s.division === d).length !== TEAMS_PER_DIVISION) {
        throw new Error(`Division ${d} does not have ${TEAMS_PER_DIVISION} teams.`);
      }
    }

    const { ensureTeams, writeWeekPlan } = await import("./season-setup.server");
    const teamIds = await ensureTeams(
      supabase,
      seeds.map((s) => ({ name: s.teamName, division: s.division })),
    );

    const closeOld = await supabase.from("seasons").update({ is_active: false }).eq("is_active", true);
    if (closeOld.error) throw new Error(closeOld.error.message);

    const created = await supabase
      .from("seasons")
      .insert({
        name: data.name,
        start_monday: data.startMonday,
        total_weeks: 10,
        current_week: 1,
        is_active: true,
      })
      .select("id")
      .single();
    if (created.error) throw new Error(created.error.message);

    await writeWeekPlan(
      supabase,
      created.data.id,
      1,
      seeds.map((s) => ({
        teamId: teamIds.get(s.teamName.toLowerCase())!,
        division: s.division,
        position: s.position,
      })),
    );

    // Carry the registered contacts over as team contacts.
    for (const reg of accepted) {
      const teamId = teamIds.get(reg.team_name.toLowerCase());
      if (!teamId) continue;
      const rows = [
        { team_id: teamId, player_no: 1, name: reg.player1_name, email: reg.player1_email },
        { team_id: teamId, player_no: 2, name: reg.player2_name, email: reg.player2_email },
      ];
      const upsert = await supabase
        .from("team_players")
        .upsert(rows, { onConflict: "team_id,player_no" });
      if (upsert.error) throw new Error(upsert.error.message);
    }

    // Close registration for the season that just started.
    const settings = await supabase
      .from("registration_settings")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (settings.data) {
      await supabase
        .from("registration_settings")
        .update({ is_open: false, target_season: targetSeason })
        .eq("id", settings.data.id);
    }

    return { ok: true as const, seasonId: created.data.id };
  });
