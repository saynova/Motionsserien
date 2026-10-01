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
  player2_phone: string;
  swish_ref: string;
  is_paid: boolean;
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
  requireSignIn: boolean;
  targetSeason: string;
  tournamentStartsAt: string | null;
  paymentDetails: string;
  seasonName: string;
};


const REG_COLUMNS =
  "id, target_season, team_name, player1_name, player1_email, player2_name, player2_email, phone, player2_phone, swish_ref, is_paid, previous_division, status, created_at";
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
        .select("is_open, target_season, require_sign_in, tournament_starts_at")
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
      requireSignIn: settings.data?.require_sign_in !== false,
      targetSeason: settings.data?.target_season ?? "",
      tournamentStartsAt: settings.data?.tournament_starts_at ?? null,
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
    const supabase = adminClient();
    const settings = await supabase
      .from("registration_settings")
      .select("target_season")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (settings.error) throw new Error(settings.error.message);
    const targetSeason = settings.data?.target_season ?? "";

    const [regs, seeds] = await Promise.all([
      supabase
        .from("registrations")
        .select("team_name, player1_name, player2_name")
        .eq("status", "accepted")
        .eq("target_season", targetSeason)
        .order("team_name", { ascending: true }),
      supabase
        .from("season_seeds")
        .select("team_name, division")
        .eq("target_season", targetSeason),
    ]);
    if (regs.error) throw new Error(regs.error.message);
    if (seeds.error) throw new Error(seeds.error.message);

    const divisionByTeam = new Map(
      ((seeds.data ?? []) as Array<{ team_name: string; division: number }>).map((s) => [
        s.team_name.toLowerCase(),
        s.division,
      ]),
    );
    const teams: RegisteredTeam[] = (
      (regs.data ?? []) as Array<{
        team_name: string;
        player1_name: string;
        player2_name: string;
      }>
    ).map((r) => ({
      team_name: r.team_name,
      division: divisionByTeam.get(r.team_name.toLowerCase()) ?? null,
      player1_name: r.player1_name,
      player2_name: r.player2_name,
    }));
    return teams.sort((a, b) => {
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
      player2Phone?: string;
      swishRef?: string;
      payLater?: boolean;
      lateCancelAck?: boolean;
      previousDivision: number | null | string;
    }) => {
      const swishRef = String(data?.swishRef ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      const payLater = data?.payLater === true;
      if (!payLater && !/^\d[\d ]{3,}$/.test(swishRef)) {
        throw new Error(
          'Enter your Swish reference number (numbers only) or choose "I will pay later".',
        );
      }
      const phone = String(data?.phone ?? "").trim().slice(0, 40);
      const player2Phone = String(data?.player2Phone ?? "").trim().slice(0, 40);
      if (phone.length < 5) throw new Error("Enter Player 1 phone number.");
      if (player2Phone.length < 5) throw new Error("Enter Player 2 phone number.");
      const player1Email = cleanEmail(data?.player1Email, "Player 1 email");
      const player2Email = cleanEmail(data?.player2Email, "Player 2 email");
      if (player1Email === player2Email) {
        throw new Error("Player 2 needs a different email from Player 1.");
      }
      return {
        teamName: cleanText(data?.teamName, 2, 60, "Team name"),
        player1Name: cleanText(data?.player1Name, 2, 60, "Player 1 name"),
        player1Email,
        player2Name: cleanText(data?.player2Name, 2, 60, "Player 2 name"),
        player2Email,
        phone,
        player2Phone,
        swishRef: payLater ? "" : swishRef,
        previousDivision: cleanDivision(data?.previousDivision),
      };
    },
  )
  .handler(async ({ data }) => {
    const { adminClient } = await import("./tournament.server");
    const supabase = adminClient();

    const settings = await supabase
      .from("registration_settings")
      .select("is_open, target_season, require_sign_in")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (settings.error) throw new Error(settings.error.message);
    if (settings.data?.is_open !== true) throw new Error("Registration is closed right now.");
    if (settings.data?.require_sign_in !== false) {
      throw new Error("Please sign in to register your team.");
    }

    const targetSeason = settings.data?.target_season ?? "";
    const dup = await supabase
      .from("registrations")
      .select("id")
      .eq("target_season", targetSeason)
      .ilike("team_name", data.teamName)
      .maybeSingle();
    if (dup.data) throw new Error("That team name is already registered for this season.");

    const { error } = await supabase.from("registrations").insert({
      target_season: targetSeason,
      team_name: data.teamName,
      player1_name: data.player1Name,
      player1_email: data.player1Email,
      player2_name: data.player2Name,
      player2_email: data.player2Email,
      phone: data.phone,
      player2_phone: data.player2Phone,
      swish_ref: data.swishRef,
      late_cancel_ack: true,
      previous_division: data.previousDivision,
      status: "pending",
    });
    if (error) {
      if (error.code === "23505" || error.code === "23U05" || /duplicate/i.test(error.message)) {
        throw new Error("That team name is already registered for this season.");
      }
      throw new Error(error.message);
    }
    const { closeRegistrationIfFull } = await import("./season-setup.server");
    await closeRegistrationIfFull(supabase, targetSeason);
    return { ok: true as const };

  });


// --------------------------------------------------------------------- admin

export const listRegistrations = createServerFn({ method: "GET" }).handler(
  async (): Promise<Registration[]> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const db = adminClient();
    const settings = await db.from("registration_settings").select("target_season").order("created_at", { ascending: true }).limit(1).maybeSingle();
    const { data, error } = await db
      .from("registrations")
      .select(REG_COLUMNS)
      .eq("target_season", settings.data?.target_season ?? "")
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
    const db = adminClient();
    const { data: reg, error } = await db
      .from("registrations")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("team_name, target_season, previous_division")
      .single();
    if (error) throw new Error(error.message);
    // Keep the seeding board in sync: approved teams join it, others leave it.
    const seeds = await db
      .from("season_seeds")
      .select("team_name, division, position")
      .eq("target_season", reg.target_season);
    if (seeds.error) throw new Error(seeds.error.message);
    const list = seeds.data ?? [];
    const onBoard = list.find((s) => s.team_name.toLowerCase() === reg.team_name.toLowerCase());
    if (data.status === "accepted" && !onBoard) {
      const pref = reg.previous_division ?? DIVISION_COUNT;
      const order = Array.from({ length: DIVISION_COUNT }, (_, i) => i + 1).sort(
        (a, b) => Math.abs(a - pref) - Math.abs(b - pref) || b - a,
      );
      let division = pref;
      for (const d of order) {
        if (list.filter((s) => s.division === d).length < TEAMS_PER_DIVISION) {
          division = d;
          break;
        }
      }
      const position = Math.max(0, ...list.filter((s) => s.division === division).map((s) => s.position)) + 1;
      const ins = await db
        .from("season_seeds")
        .insert({ target_season: reg.target_season, team_name: reg.team_name, division, position });
      if (ins.error) throw new Error(ins.error.message);
    } else if (data.status !== "accepted" && onBoard) {
      await db
        .from("season_seeds")
        .delete()
        .eq("target_season", reg.target_season)
        .eq("team_name", onBoard.team_name);
    }
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

export const setRegistrationSignInRequired = createServerFn({ method: "POST" })
  .inputValidator((data: { requireSignIn: boolean }) => ({
    requireSignIn: data?.requireSignIn === true,
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
    const result = existing.data
      ? await supabase
          .from("registration_settings")
          .update({ require_sign_in: data.requireSignIn })
          .eq("id", existing.data.id)
      : await supabase
          .from("registration_settings")
          .insert({ require_sign_in: data.requireSignIn });
    if (result.error) throw new Error(result.error.message);
    return { ok: true as const };
  });

export const setTournamentStart = createServerFn({ method: "POST" })
  .inputValidator((data: { startsAt: string | null }) => {
    if (data?.startsAt === null || data?.startsAt === "") return { startsAt: null };
    const parsed = new Date(data.startsAt);
    if (Number.isNaN(parsed.getTime())) throw new Error("Choose a valid tournament start time.");
    return { startsAt: parsed.toISOString() };
  })
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
    const result = existing.data
      ? await supabase
          .from("registration_settings")
          .update({ tournament_starts_at: data.startsAt })
          .eq("id", existing.data.id)
      : await supabase.from("registration_settings").insert({ tournament_starts_at: data.startsAt });
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
    supabase.from("registrations").select(REG_COLUMNS).eq("status", "accepted").eq("target_season", targetSeason),
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

async function generateSeedBoard() {
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
}

export const buildSeedSuggestion = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  return generateSeedBoard();
});

/**
 * Locks registration: closes sign-ups, accepts the teams that signed up (up to 30,
 * in the order they registered) and fills the seeding board from their division
 * input — new teams start at the bottom division and work upwards.
 */
export const lockRegistrationAndAssign = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const { adminClient } = await import("./tournament.server");
  const { MAX_TEAMS } = await import("./season-setup.server");
  const supabase = adminClient();

  const settings = await supabase
    .from("registration_settings")
    .select("id, target_season")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (settings.error) throw new Error(settings.error.message);
  const targetSeason = settings.data?.target_season ?? "";
  if (settings.data) {
    const close = await supabase
      .from("registration_settings")
      .update({ is_open: false })
      .eq("id", settings.data.id);
    if (close.error) throw new Error(close.error.message);
  }

  const regs = await supabase
    .from("registrations")
    .select("id, status")
    .eq("target_season", targetSeason)
    .in("status", ["pending", "accepted", "waitlisted"])
    .order("created_at", { ascending: true });
  if (regs.error) throw new Error(regs.error.message);
  const rows = regs.data ?? [];

  const toAccept = rows.slice(0, MAX_TEAMS).filter((r) => r.status !== "accepted");
  const toWaitlist = rows.slice(MAX_TEAMS).filter((r) => r.status !== "waitlisted");
  if (toAccept.length > 0) {
    const upd = await supabase
      .from("registrations")
      .update({ status: "accepted" })
      .in("id", toAccept.map((r) => r.id));
    if (upd.error) throw new Error(upd.error.message);
  }
  if (toWaitlist.length > 0) {
    const upd = await supabase
      .from("registrations")
      .update({ status: "waitlisted" })
      .in("id", toWaitlist.map((r) => r.id));
    if (upd.error) throw new Error(upd.error.message);
  }

  const board = await generateSeedBoard();
  return {
    ...board,
    acceptedCount: Math.min(rows.length, MAX_TEAMS),
    waitlistedCount: Math.max(0, rows.length - MAX_TEAMS),
  };
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
        registration_key: targetSeason,
        require_login_for_scores: true,
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

export const setRegistrationPaid = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; isPaid: boolean }) => ({ id: String(data?.id ?? ""), isPaid: data?.isPaid === true }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient().from("registrations").update({ is_paid: data.isPaid }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
