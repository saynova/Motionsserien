import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { DIVISION_COUNT } from "./tournament";

export type MyTeamPerformance = {
  division: number;
  rank: number;
  played: number;
  matchWins: number;
  setsWon: number;
  setsLost: number;
  pointsFor: number;
  pointsAgainst: number;
};

export type TeamHistoryPoint = {
  week: number;
  division: number;
  rank: number;
  wins: number;
  played: number;
};

export type MyMatchResult = {
  week: number;
  opponent: string;
  setsFor: number;
  setsAgainst: number;
  score: string;
  won: boolean;
};

export type MyTeam = {
  registrationId: string;
  seasonKey: string;
  teamName: string;
  status: string;
  playerNo: number;
  player1Name: string;
  player2Name: string;
  hasPartnerAccount: boolean;
  performance: MyTeamPerformance | null;
  history: TeamHistoryPoint[];
  matches: MyMatchResult[];
  teamPaid: boolean | null;
};

export type SignedUpTeam = {
  teamName: string;
  player1Name: string;
  player2Name: string;
  status: string;
  previousDivision: number | null;
};

export type MyReceipt = {
  id: string;
  seasonKey: string;
  teamName: string;
  amount: number;
  invoiceNo: number;
  status: string;
  createdAt: string;
};

export type MyPartnerRequest = {
  id: string;
  seasonKey: string;
  status: string;
  name: string;
};

export type MyAccount = {
  email: string;
  registration: { key: string; isOpen: boolean };
  teams: MyTeam[];
  signedUpTeams: SignedUpTeam[];
  partnerRequest: MyPartnerRequest | null;
  receipts: MyReceipt[];
  receiptOffer: null | {
    registrationId: string;
    teamName: string;
    seasonKey: string;
    remaining: number;
    alreadyClaimed: boolean;
    teamPaid: boolean;
  };

};

function text(value: unknown, min: number, max: number, label: string) {
  const v = String(value ?? "").trim();
  if (v.length < min || v.length > max) throw new Error(`${label} must be ${min}–${max} characters.`);
  return v;
}

function division(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || value === "new") return null;
  const d = Number(value);
  if (!Number.isInteger(d) || d < 1 || d > DIVISION_COUNT) throw new Error("Pick a valid division.");
  return d;
}

async function userEmail(userId: string): Promise<string> {
  const { adminClient } = await import("./tournament.server");
  const { data, error } = await adminClient().auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("Could not load your account.");
  if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
    throw new Error("Please confirm your email address first.");
  }
  return (data.user.email ?? "").toLowerCase();
}

// ------------------------------------------------------------------ overview

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAccount> => {
    const { adminClient } = await import("./tournament.server");
    const { currentRegistrationKey, autoLinkByEmail } = await import("./account.server");
    const db = adminClient();
    const email = await userEmail(context.userId);
    const registration = await currentRegistrationKey();
    await autoLinkByEmail(context.userId, email);


    const links = await db
      .from("account_links")
      .select("season_key, registration_id, player_no")
      .eq("user_id", context.userId);
    if (links.error) throw new Error(links.error.message);
    const regIds = (links.data ?? []).map((l) => l.registration_id);

    const [regs, allLinks, partner, receipts, season, signedUp] = await Promise.all([
      regIds.length
        ? db.from("registrations").select("id, team_name, status, player1_name, player2_name").in("id", regIds)
        : Promise.resolve({ data: [], error: null }),
      regIds.length
        ? db.from("account_links").select("registration_id, player_no").in("registration_id", regIds)
        : Promise.resolve({ data: [], error: null }),
      db
        .from("partner_requests")
        .select("id, season_key, status, name")
        .eq("user_id", context.userId)
        .eq("season_key", registration.key)
        .maybeSingle(),
      db
        .from("invoices")
        .select("id, season_key, team_name, amount, invoice_no, status, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
      db
        .from("seasons")
        .select("id, registration_key, invoices_open, current_week")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      registration.key
        ? db
            .from("registrations")
            .select("team_name, player1_name, player2_name, status, previous_division")
            .eq("target_season", registration.key)
            .in("status", ["pending", "accepted", "waitlisted"])
            .order("team_name")
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const r of [regs, allLinks, partner, receipts, season, signedUp]) if (r.error) throw new Error(r.error.message);

    const regById = new Map((regs.data ?? []).map((r) => [r.id, r]));

    // Performance, week-by-week history and match results for teams in the active season.
    const perfByName = new Map<string, MyTeamPerformance>();
    const historyByName = new Map<string, TeamHistoryPoint[]>();
    const resultsByName = new Map<string, MyMatchResult[]>();
    if (season.data) {
      const seasonId = season.data.id;
      const currentWeek = season.data.current_week;
      const [slotRows, matchRows, teamRows] = await Promise.all([
        db.from("week_slots").select("id, week_no, team_id, division, position, tie_break_adj").eq("season_id", seasonId),
        db.from("matches").select("id, week_no, division, match_no, team_a_id, team_b_id, court, start_time, status, s1a, s1b, s2a, s2b, s3a, s3b, submitted_by").eq("season_id", seasonId),
        db.from("teams").select("id, name, start_division"),
      ]);
      for (const r of [slotRows, matchRows, teamRows]) if (r.error) throw new Error(r.error.message);
      const { computeStandings } = await import("./tournament");
      const allSlots = slotRows.data ?? [];
      const allMatches = (matchRows.data ?? []) as import("./tournament").MatchRow[];
      const allTeams = teamRows.data ?? [];

      const teamNameById = new Map(allTeams.map((t) => [t.id, t.name]));
      const pushResult = (name: string, result: MyMatchResult) => {
        const key = name.toLowerCase();
        resultsByName.set(key, [...(resultsByName.get(key) ?? []), result]);
      };
      for (const m of allMatches.filter((x) => x.status === "final")) {
        const aName = teamNameById.get(m.team_a_id);
        const bName = teamNameById.get(m.team_b_id);
        if (!aName || !bName) continue;
        let aSets = 0;
        let bSets = 0;
        const parts: string[] = [];
        for (const [x, y] of [
          [m.s1a, m.s1b],
          [m.s2a, m.s2b],
          [m.s3a, m.s3b],
        ] as const) {
          if (x === null || y === null || x === undefined || y === undefined) continue;
          parts.push(`${x}–${y}`);
          if (x > y) aSets++;
          else if (y > x) bSets++;
        }
        const score = parts.join(", ");
        pushResult(aName, { week: m.week_no, opponent: bName, setsFor: aSets, setsAgainst: bSets, score, won: aSets > bSets });
        pushResult(bName, { week: m.week_no, opponent: aName, setsFor: bSets, setsAgainst: aSets, score, won: bSets > aSets });
      }
      for (const list of resultsByName.values()) list.sort((a, b) => a.week - b.week);

      for (let w = 1; w <= currentWeek; w++) {
        const standings = computeStandings(
          allSlots.filter((s) => s.week_no === w),
          allMatches.filter((m) => m.week_no <= w),
          allTeams,
        );
        for (const rows of standings.values()) {
          for (const row of rows) {
            const key = row.teamName.toLowerCase();
            const point: TeamHistoryPoint = {
              week: w,
              division: row.division,
              rank: row.rank,
              wins: row.matchWins,
              played: row.played,
            };
            historyByName.set(key, [...(historyByName.get(key) ?? []), point]);
            if (w === currentWeek) {
              perfByName.set(key, {
                division: row.division,
                rank: row.rank,
                played: row.played,
                matchWins: row.matchWins,
                setsWon: row.setsWon,
                setsLost: row.setsLost,
                pointsFor: row.pointsFor,
                pointsAgainst: row.pointsAgainst,
              });
            }
          }
        }
      }
    }

    const teams: MyTeam[] = (links.data ?? []).flatMap((l) => {
      const r = regById.get(l.registration_id);
      if (!r) return [];
      const isActiveSeason = season.data?.registration_key === l.season_key;
      return [
        {
          registrationId: r.id,
          seasonKey: l.season_key,
          teamName: r.team_name,
          status: r.status,
          playerNo: l.player_no,
          player1Name: r.player1_name,
          player2Name: r.player2_name,
          hasPartnerAccount:
            (allLinks.data ?? []).filter((x) => x.registration_id === r.id).length >= 2,
          performance:
            isActiveSeason && r.status === "accepted"
              ? (perfByName.get(r.team_name.toLowerCase()) ?? null)
              : null,
          history:
            isActiveSeason && r.status === "accepted"
              ? (historyByName.get(r.team_name.toLowerCase()) ?? [])
              : [],
          matches:
            isActiveSeason && r.status === "accepted"
              ? (resultsByName.get(r.team_name.toLowerCase()) ?? [])
              : [],
          teamPaid: null,
        },
      ];
    });

    // Payment status for teams in the active season.
    if (season.data) {
      const { isTeamPaid } = await import("./account.server");
      for (const t of teams) {
        if (t.seasonKey === season.data.registration_key && t.status === "accepted") {
          t.teamPaid = await isTeamPaid(t.teamName);
        }
      }
    }

    let receiptOffer: MyAccount["receiptOffer"] = null;
    const activeKey = season.data?.registration_key;
    if (season.data?.invoices_open && activeKey) {
      const team = teams.find((t) => t.seasonKey === activeKey && t.status === "accepted");
      if (team) {
        const used = await db
          .from("invoices")
          .select("amount, user_id")
          .eq("registration_id", team.registrationId)
          .eq("status", "issued");
        if (used.error) throw new Error(used.error.message);
        const total = (used.data ?? []).reduce((s, x) => s + x.amount, 0);
        const { isTeamPaid } = await import("./account.server");
        receiptOffer = {
          registrationId: team.registrationId,
          teamName: team.teamName,
          seasonKey: activeKey,
          remaining: 800 - total,
          alreadyClaimed: (used.data ?? []).some((x) => x.user_id === context.userId),
          teamPaid: await isTeamPaid(team.teamName),
        };
      }
    }


    return {
      email,
      registration,
      teams,
      signedUpTeams: (signedUp.data ?? []).map((t) => ({
        teamName: t.team_name,
        player1Name: t.player1_name,
        player2Name: t.player2_name,
        status: t.status,
        previousDivision: t.previous_division,
      })),
      partnerRequest: partner.data
        ? { id: partner.data.id, seasonKey: partner.data.season_key, status: partner.data.status, name: partner.data.name }
        : null,
      receipts: (receipts.data ?? []).map((r) => ({
        id: r.id,
        seasonKey: r.season_key,
        teamName: r.team_name,
        amount: r.amount,
        invoiceNo: Number(r.invoice_no),
        status: r.status,
        createdAt: r.created_at,
      })),
      receiptOffer,
    };
  });

// ------------------------------------------------------------- registration

export const listJoinableTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { adminClient } = await import("./tournament.server");
    const { currentRegistrationKey } = await import("./account.server");
    const db = adminClient();
    const { key } = await currentRegistrationKey();
    const regs = await db
      .from("registrations")
      .select("id, team_name, player1_name")
      .eq("target_season", key)
      .in("status", ["pending", "accepted", "waitlisted"])
      .not("user_id", "is", null)
      .order("team_name");
    if (regs.error) throw new Error(regs.error.message);
    const ids = (regs.data ?? []).map((r) => r.id);
    const links = ids.length
      ? await db.from("account_links").select("registration_id").in("registration_id", ids)
      : { data: [], error: null };
    if (links.error) throw new Error(links.error.message);
    const count = new Map<string, number>();
    for (const l of links.data ?? []) count.set(l.registration_id, (count.get(l.registration_id) ?? 0) + 1);
    return (regs.data ?? [])
      .filter((r) => (count.get(r.id) ?? 0) < 2)
      .map((r) => ({ id: r.id, teamName: r.team_name, player1Name: r.player1_name }));
  });

async function assertNotAlreadyInSeason(userId: string, key: string) {
  const { adminClient } = await import("./tournament.server");
  const db = adminClient();
  const [link, partner] = await Promise.all([
    db.from("account_links").select("id").eq("user_id", userId).eq("season_key", key).maybeSingle(),
    db
      .from("partner_requests")
      .select("id, status")
      .eq("user_id", userId)
      .eq("season_key", key)
      .maybeSingle(),
  ]);
  if (link.data) throw new Error("Your account is already on a team for this tournament.");
  if (partner.data && partner.data.status !== "withdrawn" && partner.data.status !== "rejected") {
    throw new Error("You already asked us to find you a partner. Withdraw that request first on My account.");
  }
}

export const registerMyTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      teamName: string;
      playerName: string;
      phone: string;
      player2Name?: string;
      player2Email?: string;
      player2Phone?: string;
      swishRef?: string;
      payLater?: boolean;
      lateCancelAck?: boolean;
      previousDivision: string | number | null;
    }) => {
      const swishRef = String(d?.swishRef ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      const payLater = d?.payLater === true;
      if (d?.lateCancelAck !== true) throw new Error("Please accept the late cancellation notice.");
      if (!payLater && !/^\d[\d ]{3,}$/.test(swishRef)) throw new Error("Enter your Swish reference number (numbers only) or choose \"I will pay later\".");
      const p2Email = String(d?.player2Email ?? "").trim().toLowerCase().slice(0, 255);
      if (!p2Email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p2Email)) throw new Error("Enter a valid Player 2 email.");
      const phone = String(d?.phone ?? "").trim().slice(0, 40);
      const p2Phone = String(d?.player2Phone ?? "").trim().slice(0, 40);
      if (phone.length < 5) throw new Error("Enter Player 1 phone number.");
      if (p2Phone.length < 5) throw new Error("Enter Player 2 phone number.");
      return {
        teamName: text(d?.teamName, 2, 60, "Team name"),
        playerName: text(d?.playerName, 2, 60, "Player 1 name"),
        phone,
        player2Name: text(d?.player2Name, 2, 60, "Player 2 name"),
        player2Email: p2Email,
        player2Phone: p2Phone,
        swishRef: payLater ? "" : swishRef,
        payLater,
        previousDivision: division(d?.previousDivision),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { adminClient } = await import("./tournament.server");
    const { currentRegistrationKey } = await import("./account.server");
    const db = adminClient();
    const email = await userEmail(context.userId);
    const { key, isOpen } = await currentRegistrationKey();
    if (!isOpen) throw new Error("Registration is closed right now.");
    await assertNotAlreadyInSeason(context.userId, key);
    if (data.player2Email === email.toLowerCase()) throw new Error("Player 2 needs a different email from yours.");

    const dup = await db
      .from("registrations")
      .select("id")
      .eq("target_season", key)
      .ilike("team_name", data.teamName)
      .maybeSingle();
    if (dup.data) throw new Error("That team name is already registered for this tournament.");

    const reg = await db
      .from("registrations")
      .insert({
        target_season: key,
        team_name: data.teamName,
        player1_name: data.playerName,
        player1_email: email,
        player2_name: data.player2Name,
        player2_email: data.player2Email,
        phone: data.phone,
        player2_phone: data.player2Phone,
        swish_ref: data.swishRef,
        late_cancel_ack: true,
        previous_division: data.previousDivision,
        status: "pending",
        user_id: context.userId,
      })
      .select("id")
      .single();
    if (reg.error) {
      if (reg.error.code === "23505") throw new Error("That team name is already registered for this tournament.");
      throw new Error(reg.error.message);
    }
    const link = await db
      .from("account_links")
      .insert({ season_key: key, registration_id: reg.data.id, user_id: context.userId, player_no: 1 });
    if (link.error) {
      await db.from("registrations").delete().eq("id", reg.data.id);
      throw new Error("Your account is already on a team for this tournament.");
    }
    const { closeRegistrationIfFull } = await import("./season-setup.server");
    await closeRegistrationIfFull(db, key);
    return { ok: true as const };
  });


export const joinTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { registrationId: string; playerName: string }) => ({
    registrationId: String(d?.registrationId ?? ""),
    playerName: text(d?.playerName, 2, 60, "Your name"),
  }))
  .handler(async ({ data, context }) => {
    const { adminClient } = await import("./tournament.server");
    const { currentRegistrationKey, notifyPlayer } = await import("./account.server");
    const db = adminClient();
    const email = await userEmail(context.userId);
    const { key, isOpen } = await currentRegistrationKey();
    if (!isOpen) throw new Error("Registration is closed right now.");
    await assertNotAlreadyInSeason(context.userId, key);

    const reg = await db
      .from("registrations")
      .select("id, team_name, player1_email, target_season, status")
      .eq("id", data.registrationId)
      .maybeSingle();
    if (reg.error) throw new Error(reg.error.message);
    if (!reg.data || reg.data.target_season !== key || reg.data.status === "rejected") {
      throw new Error("That team can't be joined.");
    }
    const link = await db
      .from("account_links")
      .insert({ season_key: key, registration_id: reg.data.id, user_id: context.userId, player_no: 2 });
    if (link.error) throw new Error("That team already has two players.");
    const upd = await db
      .from("registrations")
      .update({ player2_name: data.playerName, player2_email: email })
      .eq("id", reg.data.id);
    if (upd.error) throw new Error(upd.error.message);

    await notifyPlayer(
      reg.data.player1_email,
      `${data.playerName} has joined ${reg.data.team_name}`,
      `${data.playerName} has joined your team ${reg.data.team_name} for ${key}.\nIf this is not your partner, please contact the General through the contact form on the website.`,
      `${data.playerName} har gått med i ditt lag ${reg.data.team_name} för ${key}.\nOm det inte är din partner, kontakta the General via kontaktformuläret på webbplatsen.`,
      `partner-joined-${reg.data.id}`,
    );
    return { ok: true as const };
  });

// ------------------------------------------------------------ find a partner

export const requestPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { name: string; previousDivision: string | number | null; availability: string; note: string }) => ({
      name: text(d?.name, 2, 60, "Your name"),
      previousDivision: division(d?.previousDivision),
      availability: String(d?.availability ?? "").trim().slice(0, 200),
      note: String(d?.note ?? "").trim().slice(0, 500),
    }),
  )
  .handler(async ({ data, context }) => {
    const { adminClient } = await import("./tournament.server");
    const { currentRegistrationKey } = await import("./account.server");
    const db = adminClient();
    const email = await userEmail(context.userId);
    const { key, isOpen } = await currentRegistrationKey();
    if (!isOpen) throw new Error("Registration is closed right now.");
    const link = await db.from("account_links").select("id").eq("user_id", context.userId).eq("season_key", key).maybeSingle();
    if (link.data) throw new Error("Your account is already on a team for this tournament.");
    const { error } = await db.from("partner_requests").upsert(
      {
        season_key: key,
        user_id: context.userId,
        name: data.name,
        email,
        previous_division: data.previousDivision,
        availability: data.availability,
        note: data.note,
        status: "pending",
        registration_id: null,
      },
      { onConflict: "season_key,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const withdrawPartnerRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { adminClient } = await import("./tournament.server");
    const { currentRegistrationKey } = await import("./account.server");
    const { key } = await currentRegistrationKey();
    const { error } = await adminClient()
      .from("partner_requests")
      .update({ status: "withdrawn" })
      .eq("user_id", context.userId)
      .eq("season_key", key)
      .in("status", ["pending", "approved"]);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ------------------------------------------------------------------ receipts

function receiptFilename(amount: number, seasonKey: string) {
  return `Kvitto-${seasonKey.replace(/[^\w-]+/g, "-")}-${amount}kr.pdf`;
}


export const claimReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number }) => {
    const amount = Number(d?.amount);
    if (amount !== 400 && amount !== 800) throw new Error("Choose 400 kr or 800 kr.");
    return { amount: amount as 400 | 800 };
  })
  .handler(async ({ data, context }) => {
    const { adminClient } = await import("./tournament.server");
    const { buildReceiptPdf, todayStockholm, notifyPlayer, autoLinkByEmail, isTeamPaid } =
      await import("./account.server");

    const db = adminClient();
    const email = await userEmail(context.userId);
    await autoLinkByEmail(context.userId, email);


    const season = await db
      .from("seasons")
      .select("registration_key, invoices_open")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (season.error) throw new Error(season.error.message);
    const key = season.data?.registration_key;
    if (!season.data?.invoices_open || !key) throw new Error("Receipts are not available yet.");

    const link = await db
      .from("account_links")
      .select("registration_id, player_no")
      .eq("user_id", context.userId)
      .eq("season_key", key)
      .maybeSingle();
    if (!link.data) throw new Error("Your account is not on a team in this tournament.");
    const reg = await db
      .from("registrations")
      .select("id, status, team_name, player1_name, player2_name")
      .eq("id", link.data.registration_id)
      .single();
    if (reg.error || reg.data.status !== "accepted") throw new Error("Your team is not confirmed.");
    if (!(await isTeamPaid(reg.data.team_name))) {
      throw new Error("Your team fee is not registered as paid yet, so a receipt cannot be created.");
    }
    const playerName = link.data.player_no === 1 ? reg.data.player1_name : reg.data.player2_name;


    const claim = await db.rpc("claim_invoice", {
      _registration_id: reg.data.id,
      _user_id: context.userId,
      _amount: data.amount,
      _player_name: playerName,
      _email: email,
    });
    if (claim.error) throw new Error(claim.error.message);
    const invoiceId = claim.data as string;

    const pdf = await buildReceiptPdf(data.amount, playerName, todayStockholm(), key);
    const path = `${key.replace(/[^\w-]+/g, "_")}/${invoiceId}.pdf`;
    const up = await db.storage.from("invoices").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) {
      await db.from("invoices").update({ status: "void" }).eq("id", invoiceId);
      throw new Error("Could not save your receipt. Please try again.");
    }
    await db.from("invoices").update({ file_path: path }).eq("id", invoiceId);

    await notifyPlayer(
      email,
      `Your receipt (${data.amount} kr) – ${key}`,
      `Your receipt for ${data.amount} kr is ready. You can download it any time from My account on the website.`,
      `Ditt kvitto på ${data.amount} kr är klart. Du kan ladda ner det när som helst under Mitt konto på webbplatsen.`,
      `receipt-${invoiceId}`,
    );
    return {
      base64: Buffer.from(pdf).toString("base64"),
      filename: receiptFilename(data.amount, key),
    };
  });

export const getMyReceiptFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { adminClient } = await import("./tournament.server");
    const { receiptBase64 } = await import("./account.server");
    const inv = await adminClient()
      .from("invoices")
      .select("file_path, user_id, status, amount, season_key")
      .eq("id", data.id)
      .maybeSingle();
    if (!inv.data || inv.data.user_id !== context.userId || !inv.data.file_path) {
      throw new Error("Receipt not found.");
    }
    if (inv.data.status !== "issued") throw new Error("This receipt was cancelled.");
    return {
      base64: await receiptBase64(inv.data.file_path),
      filename: receiptFilename(inv.data.amount, inv.data.season_key),
    };
  });

