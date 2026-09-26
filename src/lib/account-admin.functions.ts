import { createServerFn } from "@tanstack/react-start";

async function gate() {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const { adminClient } = await import("./tournament.server");
  return adminClient();
}

export type AdminPartnerRequest = {
  id: string;
  season_key: string;
  name: string;
  email: string;
  previous_division: number | null;
  availability: string;
  note: string;
  status: string;
  created_at: string;
};

export const listPartnerRequests = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminPartnerRequest[]> => {
    const db = await gate();
    const { data, error } = await db
      .from("partner_requests")
      .select("id, season_key, name, email, previous_division, availability, note, status, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminPartnerRequest[];
  },
);

export const setPartnerRequestStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "approved" | "rejected" | "pending" }) => {
    if (!["approved", "rejected", "pending"].includes(d?.status)) throw new Error("Unknown status.");
    return { id: String(d.id), status: d.status };
  })
  .handler(async ({ data }) => {
    const db = await gate();
    const row = await db.from("partner_requests").select("email, status, season_key").eq("id", data.id).single();
    if (row.error) throw new Error(row.error.message);
    if (row.data.status === "paired") throw new Error("This player is already paired.");
    const { error } = await db.from("partner_requests").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.status === "approved") {
      const { notifyPlayer } = await import("./account.server");
      await notifyPlayer(
        row.data.email,
        "You're approved – we're finding you a partner",
        `Your request to find a partner for ${row.data.season_key} has been approved. We'll email you as soon as we have paired you with a partner.`,
        `Din förfrågan om att hitta en partner till ${row.data.season_key} har godkänts. Vi mejlar dig så snart vi har hittat en partner åt dig.`,
        `partner-approved-${data.id}`,
      );
    }
    return { ok: true as const };
  });

export const pairPartners = createServerFn({ method: "POST" })
  .inputValidator((d: { firstId: string; secondId: string; teamName: string }) => {
    const teamName = String(d?.teamName ?? "").trim();
    if (teamName.length < 2 || teamName.length > 60) throw new Error("Team name must be 2–60 characters.");
    if (!d?.firstId || !d?.secondId || d.firstId === d.secondId) throw new Error("Pick two different players.");
    return { firstId: String(d.firstId), secondId: String(d.secondId), teamName };
  })
  .handler(async ({ data }) => {
    const db = await gate();
    const rows = await db
      .from("partner_requests")
      .select("id, season_key, user_id, name, email, previous_division, status")
      .in("id", [data.firstId, data.secondId]);
    if (rows.error) throw new Error(rows.error.message);
    const [a, b] = [data.firstId, data.secondId].map((id) => rows.data?.find((r) => r.id === id));
    if (!a || !b) throw new Error("Player not found.");
    if (a.status !== "approved" || b.status !== "approved") throw new Error("Both players must be approved first.");
    if (a.season_key !== b.season_key) throw new Error("Players are in different tournaments.");
    const key = a.season_key;

    const dup = await db.from("registrations").select("id").eq("target_season", key).ilike("team_name", data.teamName).maybeSingle();
    if (dup.data) throw new Error("That team name is already used in this tournament.");

    const divs = [a.previous_division, b.previous_division].filter((x): x is number => x !== null);
    const reg = await db
      .from("registrations")
      .insert({
        target_season: key,
        team_name: data.teamName,
        player1_name: a.name,
        player1_email: a.email,
        player2_name: b.name,
        player2_email: b.email,
        phone: "",
        previous_division: divs.length ? Math.min(...divs) : null,
        status: "pending",
        user_id: a.user_id,
      })
      .select("id")
      .single();
    if (reg.error) throw new Error(reg.error.message);
    const links = await db.from("account_links").insert([
      { season_key: key, registration_id: reg.data.id, user_id: a.user_id, player_no: 1 },
      { season_key: key, registration_id: reg.data.id, user_id: b.user_id, player_no: 2 },
    ]);
    if (links.error) {
      await db.from("registrations").delete().eq("id", reg.data.id);
      throw new Error("One of these players is already on a team.");
    }
    await db.from("partner_requests").update({ status: "paired", registration_id: reg.data.id }).in("id", [a.id, b.id]);

    const { notifyPlayer } = await import("./account.server");
    for (const [me, other] of [
      [a, b],
      [b, a],
    ] as const) {
      await notifyPlayer(
        me.email,
        `You have a partner: ${other.name}`,
        `Good news! You have been paired with ${other.name} in the team "${data.teamName}" for ${key}.\nThe team will be confirmed once the admin approves the registration.`,
        `Goda nyheter! Du har parats ihop med ${other.name} i laget "${data.teamName}" för ${key}.\nLaget bekräftas när administratören har godkänt anmälan.`,
        `paired-${me.id}`,
      );
    }
    return { ok: true as const };
  });

export const removeAccountLink = createServerFn({ method: "POST" })
  .inputValidator((d: { registrationId: string; playerNo: number }) => ({
    registrationId: String(d?.registrationId ?? ""),
    playerNo: Number(d?.playerNo) === 1 ? 1 : 2,
  }))
  .handler(async ({ data }) => {
    const db = await gate();
    const { error } = await db
      .from("account_links")
      .delete()
      .eq("registration_id", data.registrationId)
      .eq("player_no", data.playerNo);
    if (error) throw new Error(error.message);
    if (data.playerNo === 2) {
      await db.from("registrations").update({ player2_name: "", player2_email: "" }).eq("id", data.registrationId);
    }
    return { ok: true as const };
  });

export const listAccountLinks = createServerFn({ method: "GET" }).handler(async () => {
  const db = await gate();
  const { data, error } = await db.from("account_links").select("registration_id, player_no");
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ------------------------------------------------------------------ receipts

export type AdminReceiptTeam = {
  registrationId: string;
  teamName: string;
  players: string[];
  used: number;
  receipts: Array<{ id: string; playerName: string; amount: number; invoiceNo: number; status: string; createdAt: string }>;
};

export const listReceipts = createServerFn({ method: "GET" }).handler(async () => {
  const db = await gate();
  const season = await db
    .from("seasons")
    .select("id, name, registration_key, invoices_open, require_login_for_scores")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (season.error) throw new Error(season.error.message);
  const key = season.data?.registration_key ?? null;
  let teams: AdminReceiptTeam[] = [];
  if (key) {
    const [regs, invs] = await Promise.all([
      db.from("registrations").select("id, team_name, player1_name, player2_name").eq("target_season", key).eq("status", "accepted").order("team_name"),
      db.from("invoices").select("id, registration_id, player_name, amount, invoice_no, status, created_at").eq("season_key", key).order("created_at"),
    ]);
    if (regs.error) throw new Error(regs.error.message);
    if (invs.error) throw new Error(invs.error.message);
    teams = (regs.data ?? []).map((r) => {
      const receipts = (invs.data ?? [])
        .filter((i) => i.registration_id === r.id)
        .map((i) => ({ id: i.id, playerName: i.player_name, amount: i.amount, invoiceNo: Number(i.invoice_no), status: i.status, createdAt: i.created_at }));
      return {
        registrationId: r.id,
        teamName: r.team_name,
        players: [r.player1_name, r.player2_name].filter(Boolean),
        used: receipts.filter((x) => x.status === "issued").reduce((s, x) => s + x.amount, 0),
        receipts,
      };
    });
  }
  return {
    season: season.data
      ? {
          id: season.data.id,
          name: season.data.name,
          accountBased: !!key,
          invoicesOpen: season.data.invoices_open,
          requireLogin: season.data.require_login_for_scores,
        }
      : null,
    teams,
  };
});

export const setSeasonAccountFlags = createServerFn({ method: "POST" })
  .inputValidator((d: { seasonId: string; invoicesOpen?: boolean; requireLogin?: boolean }) => ({
    seasonId: String(d?.seasonId ?? ""),
    invoicesOpen: typeof d?.invoicesOpen === "boolean" ? d.invoicesOpen : undefined,
    requireLogin: typeof d?.requireLogin === "boolean" ? d.requireLogin : undefined,
  }))
  .handler(async ({ data }) => {
    const db = await gate();
    const patch: { invoices_open?: boolean; require_login_for_scores?: boolean } = {};
    if (data.invoicesOpen !== undefined) patch.invoices_open = data.invoicesOpen;
    if (data.requireLogin !== undefined) patch.require_login_for_scores = data.requireLogin;
    const { error } = await db.from("seasons").update(patch).eq("id", data.seasonId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const voidReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const db = await gate();
    const { error } = await db.from("invoices").update({ status: "void" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminReceiptUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const db = await gate();
    const inv = await db.from("invoices").select("file_path").eq("id", data.id).maybeSingle();
    if (!inv.data?.file_path) throw new Error("Receipt file not found.");
    const signed = await db.storage.from("invoices").createSignedUrl(inv.data.file_path, 600, { download: true });
    if (signed.error || !signed.data) throw new Error("Could not prepare the download.");
    return { url: signed.data.signedUrl };
  });

export const sampleReceiptPdf = createServerFn({ method: "POST" })
  .inputValidator((d: { amount: number; name?: string }) => {
    const amount = Number(d?.amount);
    if (amount !== 400 && amount !== 800) throw new Error("Choose 400 kr or 800 kr.");
    return { amount: amount as 400 | 800, name: String(d?.name ?? "").trim().slice(0, 80) };
  })
  .handler(async ({ data }) => {
    await gate();
    const { buildReceiptPdf, todayStockholm } = await import("./account.server");
    const pdf = await buildReceiptPdf(data.amount, data.name || "Sample Player", todayStockholm());
    return { base64: Buffer.from(pdf).toString("base64") };
  });
