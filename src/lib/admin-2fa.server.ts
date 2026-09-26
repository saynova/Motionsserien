// Server-only helpers for the admin two-factor sign-in.
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";

import { generateTotpSecret, totpUri, verifyTotp } from "./totp.server";

export const DEFAULT_ADMIN_EMAIL = "mdrabiul.aiub@gmail.com";
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;

type TrustSession = { token?: string };

function trustConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "mssn-admin-trust",
    maxAge: 60 * 60 * 24 * 400,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

function trustSession() {
  return useSession<TrustSession>(trustConfig());
}

function hash(value: string): string {
  const pepper = process.env["SESSION_SECRET"] ?? "";
  return createHash("sha256").update(`${pepper}:${value}`, "utf8").digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

async function db() {
  const { adminClient } = await import("./tournament.server");
  return adminClient();
}

export type Admin2faSettings = {
  totpEnabled: boolean;
  totpSecret: string | null;
  notifyEmail: string;
  backupCodesLeft: number;
  trustDays: number;
};

export async function getSettings(): Promise<Admin2faSettings> {
  const supabase = await db();
  const { data } = await supabase
    .from("admin_2fa_settings")
    .select("totp_secret, totp_enabled, notify_email, backup_code_hashes, trust_days")
    .eq("id", "default")
    .maybeSingle();
  return {
    totpEnabled: data?.totp_enabled === true,
    totpSecret: data?.totp_secret ?? null,
    notifyEmail: data?.notify_email ?? DEFAULT_ADMIN_EMAIL,
    backupCodesLeft: (data?.backup_code_hashes ?? []).length,
    trustDays: data?.trust_days ?? 30,
  };
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const shown = user.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

// ------------------------------------------------------------- emailed codes

/** Creates a fresh 6-digit code, emails it, and returns its row id. */
export async function issueEmailCode(): Promise<{ codeId: string; sentTo: string }> {
  const supabase = await db();
  const settings = await getSettings();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  const inserted = await supabase
    .from("admin_login_codes")
    .insert({
      code_hash: hash(code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      sent_to: settings.notifyEmail,
    })
    .select("id")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  await sendTemplateEmail("admin-login-code", settings.notifyEmail, {
    templateData: { code, minutes: 10 },
  });

  return { codeId: inserted.data.id, sentTo: maskEmail(settings.notifyEmail) };
}

async function checkEmailCode(codeId: string, input: string): Promise<boolean> {
  const supabase = await db();
  const { data } = await supabase
    .from("admin_login_codes")
    .select("id, code_hash, expires_at, used_at, attempts")
    .eq("id", codeId)
    .maybeSingle();
  if (!data || data.used_at) return false;
  if (new Date(data.expires_at).getTime() < Date.now()) return false;
  if (data.attempts >= MAX_ATTEMPTS) throw new Error("Too many attempts. Request a new code.");

  await supabase
    .from("admin_login_codes")
    .update({ attempts: data.attempts + 1 })
    .eq("id", codeId);

  if (!sameHash(data.code_hash, hash(input))) return false;
  await supabase
    .from("admin_login_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", codeId);
  return true;
}

async function checkBackupCode(input: string): Promise<boolean> {
  const supabase = await db();
  const { data } = await supabase
    .from("admin_2fa_settings")
    .select("backup_code_hashes")
    .eq("id", "default")
    .maybeSingle();
  const hashes: string[] = data?.backup_code_hashes ?? [];
  const target = hash(input.replace(/[\s-]/g, "").toUpperCase());
  const match = hashes.find((h) => sameHash(h, target));
  if (!match) return false;
  await supabase
    .from("admin_2fa_settings")
    .update({ backup_code_hashes: hashes.filter((h) => h !== match) })
    .eq("id", "default");
  return true;
}

/**
 * Accepts an emailed code, an authenticator code, or an emergency backup code.
 */
export async function verifySecondFactor(codeId: string | undefined, input: string): Promise<boolean> {
  const value = (input ?? "").trim();
  if (value.length < 6) return false;

  const digits = value.replace(/\D/g, "");
  if (codeId && digits.length === 6 && (await checkEmailCode(codeId, digits))) return true;

  const settings = await getSettings();
  if (settings.totpEnabled && settings.totpSecret && digits.length === 6) {
    if (verifyTotp(settings.totpSecret, digits)) return true;
  }

  return checkBackupCode(value);
}

// --------------------------------------------------------- trusted browsers

export async function isTrustedDevice(): Promise<boolean> {
  const session = await trustSession();
  const token = session.data.token;
  if (!token) return false;
  const supabase = await db();
  const { data } = await supabase
    .from("admin_trusted_devices")
    .select("id, expires_at")
    .eq("token_hash", hash(token))
    .maybeSingle();
  if (!data) return false;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await supabase.from("admin_trusted_devices").delete().eq("id", data.id);
    return false;
  }
  await supabase
    .from("admin_trusted_devices")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return true;
}

export async function trustThisDevice(label: string): Promise<void> {
  const settings = await getSettings();
  const token = randomBytes(32).toString("hex");
  const supabase = await db();
  const expires = new Date(Date.now() + settings.trustDays * 24 * 60 * 60 * 1000);
  const { error } = await supabase.from("admin_trusted_devices").insert({
    token_hash: hash(token),
    label: label.slice(0, 120),
    expires_at: expires.toISOString(),
  });
  if (error) throw new Error(error.message);
  const session = await trustSession();
  await session.update({ token });
}

export async function forgetThisDevice(): Promise<void> {
  const session = await trustSession();
  const token = session.data.token;
  if (token) {
    const supabase = await db();
    await supabase.from("admin_trusted_devices").delete().eq("token_hash", hash(token));
  }
  await session.clear();
}

export async function revokeAllDevices(): Promise<number> {
  const supabase = await db();
  const { data } = await supabase.from("admin_trusted_devices").select("id");
  await supabase.from("admin_trusted_devices").delete().gte("created_at", "1970-01-01");
  const session = await trustSession();
  await session.clear();
  return (data ?? []).length;
}

export async function listDevices() {
  const supabase = await db();
  const { data } = await supabase
    .from("admin_trusted_devices")
    .select("id, label, last_used_at, expires_at, created_at")
    .order("last_used_at", { ascending: false });
  return (data ?? []).map((d) => ({
    id: d.id,
    label: d.label ?? "Unknown browser",
    lastUsedAt: d.last_used_at,
    expiresAt: d.expires_at,
  }));
}

// ------------------------------------------------------- authenticator setup

export async function beginTotpSetup(): Promise<{ secret: string; uri: string }> {
  const settings = await getSettings();
  const secret = generateTotpSecret();
  const supabase = await db();
  // Stored but not enabled until a code from the app is confirmed.
  const { error } = await supabase
    .from("admin_2fa_settings")
    .update({ totp_secret: secret, totp_enabled: false })
    .eq("id", "default");
  if (error) throw new Error(error.message);
  return { secret, uri: totpUri(secret, settings.notifyEmail) };
}

function newBackupCode(): string {
  const raw = randomBytes(5).toString("hex").toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

export async function confirmTotpSetup(code: string): Promise<string[]> {
  const settings = await getSettings();
  if (!settings.totpSecret) throw new Error("Start the setup first.");
  if (!verifyTotp(settings.totpSecret, code)) throw new Error("That code did not match. Try the next one.");
  const codes = Array.from({ length: 8 }, newBackupCode);
  const supabase = await db();
  const { error } = await supabase
    .from("admin_2fa_settings")
    .update({ totp_enabled: true, backup_code_hashes: codes.map((c) => hash(c.replace("-", ""))) })
    .eq("id", "default");
  if (error) throw new Error(error.message);
  return codes;
}

export async function disableTotp(): Promise<void> {
  const supabase = await db();
  await supabase
    .from("admin_2fa_settings")
    .update({ totp_enabled: false, totp_secret: null, backup_code_hashes: [] })
    .eq("id", "default");
}

export async function setNotifyEmail(email: string): Promise<void> {
  const supabase = await db();
  const { error } = await supabase
    .from("admin_2fa_settings")
    .update({ notify_email: email })
    .eq("id", "default");
  if (error) throw new Error(error.message);
}
