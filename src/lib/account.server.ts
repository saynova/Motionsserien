// Server-only helpers for player accounts, team links and receipts.
import { getRequest } from "@tanstack/react-start/server";

export function siteOrigin(): string {
  const req = getRequest();
  if (!req) return "https://motionsserien.se";
  const url = new URL(req.url);
  const fwd = url.hostname === "localhost" ? req.headers.get("x-forwarded-host") : null;
  return fwd ? `https://${fwd}` : url.origin;
}

/** Reads the bearer token (if any) and returns the verified user, or null. */
export async function optionalUser(): Promise<{ id: string; email: string } | null> {
  const req = getRequest();
  const header = req?.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  if (token.split(".").length !== 3) return null;
  const { adminClient } = await import("./tournament.server");
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: (data.user.email ?? "").toLowerCase() };
}

export async function currentRegistrationKey(): Promise<{ key: string; isOpen: boolean }> {
  const { adminClient } = await import("./tournament.server");
  const { data, error } = await adminClient()
    .from("registration_settings")
    .select("is_open, target_season")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { key: data?.target_season ?? "", isOpen: data?.is_open === true };
}

/**
 * Links a signed-in account to any accepted team whose registered player email
 * matches the account's own confirmed email. Safe by design: the email is
 * verified by auth, and a player slot is only linked when it is still free.
 */
export async function autoLinkByEmail(userId: string, email: string): Promise<void> {
  if (!email) return;
  const { adminClient } = await import("./tournament.server");
  const db = adminClient();
  const regs = await db
    .from("registrations")
    .select("id, target_season, player1_email, player2_email")
    .eq("status", "accepted")
    .or(`player1_email.ilike.${email},player2_email.ilike.${email}`);
  if (regs.error || !regs.data?.length) return;
  for (const reg of regs.data) {
    const playerNo = (reg.player1_email ?? "").toLowerCase() === email ? 1 : 2;
    const existing = await db
      .from("account_links")
      .select("id, user_id")
      .eq("registration_id", reg.id)
      .eq("player_no", playerNo)
      .maybeSingle();
    if (existing.data) continue;
    await db.from("account_links").insert({
      season_key: reg.target_season,
      registration_id: reg.id,
      user_id: userId,
      player_no: playerNo,
    });
  }
}

export async function notifyPlayer(
  to: string,
  subject: string,
  messageEn: string,
  messageSv: string,
  key: string,
  button?: { url: string; label: string },
) {
  if (!to) return;
  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { getEmailSettings } = await import("./email-settings.server");
    const { adminClient } = await import("./tournament.server");
    const settings = await getEmailSettings(adminClient());
    await sendTemplateEmail("player-notice", to, {
      templateData: {
        subject,
        title: subject,
        messageEn,
        messageSv,
        buttonUrl: button?.url ?? `${siteOrigin()}/account`,
        ...(button ? { buttonLabel: button.label } : {}),
        signature: settings.signature,
        footer: settings.footer,
      },
      idempotencyKey: `${key}-${crypto.randomUUID()}`,
    });
  } catch (error) {
    console.error("player email failed", error);
  }
}

function safeText(value: string): string {
  // Helvetica (WinAnsi) covers Swedish letters; replace anything else.
  return value.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");
}

/** The tournament label printed on receipts, e.g. "Motionsserien HT-26". */
export function receiptPeriodLabel(seasonKey: string): string {
  const key = (seasonKey ?? "").trim();
  if (!key) return "Motionsserien";
  return /motionsserien/i.test(key) ? key : `Motionsserien ${key}`;
}

export async function buildReceiptPdf(
  amount: 400 | 800,
  name: string,
  date: string,
  seasonKey = "",
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const { RECEIPT_400_B64, RECEIPT_800_B64 } = await import("./receipt-templates.server");
  const bytes = Buffer.from(amount === 400 ? RECEIPT_400_B64 : RECEIPT_800_B64, "base64");
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.getPage(0);
  const H = page.getHeight();
  const color = rgb(0.1, 0.1, 0.1);
  const white = rgb(1, 1, 1);
  page.drawText(safeText(date), { x: 227.4, y: H - 175, size: 11, font, color });
  page.drawText(safeText(name), { x: 180, y: H - 339, size: 11, font, color });

  // The template has the tournament name burnt in twice. Cover both and print
  // the live tournament so no one has to edit the template each season.
  const period = safeText(receiptPeriodLabel(seasonKey));
  page.drawRectangle({ x: 226, y: 630.5, width: 300, height: 17, color: white });
  page.drawText(period, { x: 227.35, y: 634.29, size: 12, font, color });
  page.drawRectangle({ x: 181, y: 515.5, width: 345, height: 17, color: white });
  page.drawText(safeText(`${receiptPeriodLabel(seasonKey).replace(/^Motionsserien\s*/i, "Motionsserien Badminton ")}`), {
    x: 182.7,
    y: 519.34,
    size: 12,
    font,
    color,
  });
  return pdf.save();
}


export function todayStockholm(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(new Date());
}

/** True when the admin has marked the team as paid for the active season. */
export async function isTeamPaid(teamName: string): Promise<boolean> {
  const { adminClient } = await import("./tournament.server");
  const db = adminClient();
  const season = await db.from("seasons").select("id").eq("is_active", true).limit(1).maybeSingle();
  if (!season.data) return false;
  const team = await db.from("teams").select("id").ilike("name", teamName).limit(1).maybeSingle();
  if (!team.data) return false;
  const pay = await db
    .from("team_payments")
    .select("is_paid")
    .eq("season_id", season.data.id)
    .eq("team_id", team.data.id)
    .maybeSingle();
  return pay.data?.is_paid === true;
}

/** Reads a stored receipt and returns it as base64 for the in-page viewer. */
export async function receiptBase64(path: string): Promise<string> {
  const { adminClient } = await import("./tournament.server");
  const { data, error } = await adminClient().storage.from("invoices").download(path);
  if (error || !data) throw new Error("Could not open the receipt.");
  return Buffer.from(await data.arrayBuffer()).toString("base64");
}
