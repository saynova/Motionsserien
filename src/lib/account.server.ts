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
        buttonUrl: `${siteOrigin()}/account`,
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

export async function buildReceiptPdf(amount: 400 | 800, name: string, date: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const { RECEIPT_400_B64, RECEIPT_800_B64 } = await import("./receipt-templates.server");
  const bytes = Buffer.from(amount === 400 ? RECEIPT_400_B64 : RECEIPT_800_B64, "base64");
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.getPage(0);
  const H = page.getHeight();
  const color = rgb(0.1, 0.1, 0.1);
  page.drawText(safeText(date), { x: 227.4, y: H - 175, size: 11, font, color });
  page.drawText(safeText(name), { x: 180, y: H - 339, size: 11, font, color });
  return pdf.save();
}

export function todayStockholm(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(new Date());
}
