import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  .inputValidator(z.object({ firstId: z.string().uuid(), secondId: z.string().uuid(), teamName: z.string().trim().min(2).max(60) }).refine((d) => d.firstId !== d.secondId, "Pick two different players."))
  .handler(async ({ data }) => {
    const db = await gate();
    const { newConfirmationToken, hashConfirmationToken, sendMatchedPlayerInvitation } = await import("./team-confirmation.server");
    const firstToken = newConfirmationToken();
    const secondToken = newConfirmationToken();
    const result = await db.rpc("create_matched_team", { _first_id: data.firstId, _second_id: data.secondId, _team_name: data.teamName, _hash1: await hashConfirmationToken(firstToken), _hash2: await hashConfirmationToken(secondToken) });
    if (result.error) throw new Error(result.error.message);
    const firstSent = await sendMatchedPlayerInvitation(db, result.data, 1, firstToken);
    const secondSent = await sendMatchedPlayerInvitation(db, result.data, 2, secondToken);
    const { closeRegistrationIfFull } = await import("./season-setup.server");
    const row = await db.from("registrations").select("target_season").eq("id", result.data).single();
    if (row.data) await closeRegistrationIfFull(db, row.data.target_season);
    return { ok: true as const, emailsSent: firstSent && secondSent };
  });

export const resendMatchedPlayerInvitation = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), playerNo: z.union([z.literal(1), z.literal(2)]) }))
  .handler(async ({ data }) => {
    const db = await gate();
    const row = await db.from("registrations").select("requires_player_confirmation, player1_confirmed_at, player2_confirmed_at, status").eq("id", data.id).single();
    if (row.error || !row.data.requires_player_confirmation || row.data.status === "rejected") throw new Error("This team has no active confirmation invitation.");
    if (data.playerNo === 1 ? row.data.player1_confirmed_at : row.data.player2_confirmed_at) throw new Error("This player has already confirmed.");
    const { newConfirmationToken, hashConfirmationToken, sendMatchedPlayerInvitation } = await import("./team-confirmation.server");
    const token = newConfirmationToken();
    const hash = await hashConfirmationToken(token);
    const update = await db.from("registrations").update({
      ...(data.playerNo === 1 ? { player1_confirmation_hash: hash } : { player2_confirmation_hash: hash }),
      confirmation_expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    }).eq("id", data.id);
    if (update.error) throw new Error("Unable to renew invitation.");
    return { sent: await sendMatchedPlayerInvitation(db, data.id, data.playerNo, token) };
  });

export const renameRegisteredTeam = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), teamName: z.string().trim().min(2).max(60) }))
  .handler(async ({ data }) => {
    const db = await gate();
    const result = await db.rpc("rename_registered_team", { _id: data.id, _name: data.teamName });
    if (result.error) throw new Error(result.error.message);
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
  paid: boolean;
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
    const [regs, invs, teamRows, payRows] = await Promise.all([
      db.from("registrations").select("id, team_name, player1_name, player2_name").eq("target_season", key).eq("status", "accepted").order("team_name"),
      db.from("invoices").select("id, registration_id, player_name, amount, invoice_no, status, created_at").eq("season_key", key).order("created_at"),
      db.from("teams").select("id, name"),
      season.data ? db.from("team_payments").select("team_id, is_paid").eq("season_id", season.data.id) : Promise.resolve({ data: [], error: null }),
    ]);
    if (regs.error) throw new Error(regs.error.message);
    if (invs.error) throw new Error(invs.error.message);
    const paidByName = new Map<string, boolean>();
    for (const t of teamRows.data ?? []) {
      const pay = (payRows.data ?? []).find((p) => p.team_id === t.id);
      paidByName.set(t.name.toLowerCase(), pay?.is_paid === true);
    }
    teams = (regs.data ?? []).map((r) => {
      const receipts = (invs.data ?? [])
        .filter((i) => i.registration_id === r.id)
        .map((i) => ({ id: i.id, playerName: i.player_name, amount: i.amount, invoiceNo: Number(i.invoice_no), status: i.status, createdAt: i.created_at }));
      return {
        registrationId: r.id,
        teamName: r.team_name,
        players: [r.player1_name, r.player2_name].filter(Boolean),
        used: receipts.filter((x) => x.status === "issued").reduce((s, x) => s + x.amount, 0),
        paid: paidByName.get(r.team_name.toLowerCase()) === true,
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

export const adminReceiptFile = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const db = await gate();
    const inv = await db
      .from("invoices")
      .select("file_path, amount, season_key, player_name")
      .eq("id", data.id)
      .maybeSingle();
    if (!inv.data?.file_path) throw new Error("Receipt file not found.");
    const { receiptBase64 } = await import("./account.server");
    const safe = (v: string) => v.replace(/[^\w-]+/g, "-");
    return {
      base64: await receiptBase64(inv.data.file_path),
      filename: `Kvitto-${safe(inv.data.season_key)}-${safe(inv.data.player_name)}-${inv.data.amount}kr.pdf`,
    };
  });


export const sampleReceiptPdf = createServerFn({ method: "POST" })
  .inputValidator((d: { amount: number; name?: string }) => {
    const amount = Number(d?.amount);
    if (amount !== 400 && amount !== 800) throw new Error("Choose 400 kr or 800 kr.");
    return { amount: amount as 400 | 800, name: String(d?.name ?? "").trim().slice(0, 80) };
  })
  .handler(async ({ data }) => {
    const db = await gate();
    const season = await db
      .from("seasons")
      .select("registration_key")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const { buildReceiptPdf, todayStockholm } = await import("./account.server");
    const pdf = await buildReceiptPdf(
      data.amount,
      data.name || "Sample Player",
      todayStockholm(),
      season.data?.registration_key ?? "",
    );
    return { base64: Buffer.from(pdf).toString("base64") };
  });


export const adminSendReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: { amount: number; name: string; email: string }) => {
    const amount = Number(d?.amount);
    if (amount !== 400 && amount !== 800) throw new Error("Choose 400 kr or 800 kr.");
    const name = String(d?.name ?? "").trim();
    if (name.length < 2 || name.length > 80) throw new Error("Enter the person's name.");
    const email = String(d?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Enter a valid email.");
    return { amount: amount as 400 | 800, name, email };
  })
  .handler(async ({ data }) => {
    const db = await gate();
    const season = await db.from("seasons").select("name, registration_key").eq("is_active", true).limit(1).maybeSingle();
    const key = season.data?.registration_key || season.data?.name || "";
    const { buildReceiptPdf, todayStockholm, notifyPlayer, siteDownloadLink } = await import("./account.server");
    const pdf = await buildReceiptPdf(data.amount, data.name, todayStockholm(), key);
    const path = `admin/${crypto.randomUUID()}.pdf`;
    const up = await db.storage.from("invoices").upload(path, pdf, { contentType: "application/pdf" });
    if (up.error) throw new Error("Could not save the receipt.");
    const signed = await db.storage.from("invoices").createSignedUrl(path, 60 * 60 * 24 * 30);
    if (signed.error || !signed.data) throw new Error("Could not create the download link.");
    await notifyPlayer(
      data.email,
      `Your receipt (${data.amount} kr) – ${key || "Motionsserien"}`,
      `Your receipt for ${data.amount} kr is ready. Use the button below to download it (the link works for 30 days).`,
      `Ditt kvitto på ${data.amount} kr är klart. Använd knappen nedan för att ladda ner det (länken fungerar i 30 dagar).`,
      `admin-receipt-${path}`,
      { url: siteDownloadLink(signed.data.signedUrl), label: "Download receipt" },
    );
    const safe = (v: string) => v.replace(/[^\w-]+/g, "-");
    return {
      base64: Buffer.from(pdf).toString("base64"),
      filename: `Kvitto-${safe(key)}-${safe(data.name)}-${data.amount}kr.pdf`,
    };
  });

export type ReceiptPlayerOption = { name: string; email: string; teamName: string; division: number | null };

/** Players in the running tournament, grouped by division, for the receipt picker. */
export const listReceiptPlayers = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReceiptPlayerOption[]> => {
    const db = await gate();
    const season = await db.from("seasons").select("id, current_week").eq("is_active", true).limit(1).maybeSingle();
    if (!season.data) return [];
    const slots = await db.from("week_slots").select("team_id, division")
      .eq("season_id", season.data.id).eq("week_no", season.data.current_week);
    const div = new Map((slots.data ?? []).map((s) => [s.team_id as string, s.division as number]));
    const ids = [...div.keys()];
    if (ids.length === 0) return [];
    const [teams, players] = await Promise.all([
      db.from("teams").select("id, name").in("id", ids),
      db.from("team_players").select("team_id, name, email, player_no").in("team_id", ids),
    ]);
    const tn = new Map((teams.data ?? []).map((t) => [t.id, t.name]));
    return (players.data ?? [])
      .filter((p) => p.name?.trim())
      .map((p) => ({ name: p.name, email: p.email ?? "", teamName: tn.get(p.team_id) ?? "", division: div.get(p.team_id) ?? null }))
      .sort((a, b) => (a.division ?? 99) - (b.division ?? 99) || a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name));
  },
);
