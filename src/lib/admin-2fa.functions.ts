// Admin two-factor sign-in: verification step, authenticator setup, trusted browsers.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

function describeBrowser(): string {
  const ua = getRequestHeader("user-agent") ?? "";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" :
    /Firefox\//.test(ua) ? "Firefox" : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

/** Step 2 of admin sign-in: emailed code, authenticator code, or backup code. */
export const verifyAdminCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; trustBrowser?: boolean }) => {
    const code = (data?.code ?? "").trim();
    if (code.length < 6) throw new Error("Enter the 6-digit code.");
    return { code, trustBrowser: data?.trustBrowser !== false };
  })
  .handler(async ({ data }) => {
    const { adminSession } = await import("./admin-session.server");
    const twoFactor = await import("./admin-2fa.server");
    const session = await adminSession();
    if (session.data.pending !== true) {
      throw new Error("Enter the admin password first.");
    }

    const ok = await twoFactor.verifySecondFactor(session.data.codeId, data.code);
    if (!ok) return { ok: false as const };

    await session.update({ unlocked: true, pending: false, codeId: undefined });
    if (data.trustBrowser) await twoFactor.trustThisDevice(describeBrowser());
    return { ok: true as const };
  });

/** Sends a fresh emailed code for the attempt in progress. */
export const resendAdminCode = createServerFn({ method: "POST" }).handler(async () => {
  const { adminSession } = await import("./admin-session.server");
  const twoFactor = await import("./admin-2fa.server");
  const session = await adminSession();
  if (session.data.pending !== true) throw new Error("Enter the admin password first.");
  const issued = await twoFactor.issueEmailCode();
  await session.update({ pending: true, codeId: issued.codeId });
  return { ok: true as const, sentTo: issued.sentTo };
});

// -------------------------------------------------------------- admin console

export const getSecurityStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const twoFactor = await import("./admin-2fa.server");
  const settings = await twoFactor.getSettings();
  return {
    totpEnabled: settings.totpEnabled,
    notifyEmail: settings.notifyEmail,
    backupCodesLeft: settings.backupCodesLeft,
    trustDays: settings.trustDays,
    thisBrowserTrusted: await twoFactor.isTrustedDevice(),
    devices: await twoFactor.listDevices(),
  };
});

export const startAuthenticatorSetup = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const twoFactor = await import("./admin-2fa.server");
  return twoFactor.beginTotpSetup();
});

export const confirmAuthenticatorSetup = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => {
    const code = (data?.code ?? "").replace(/\D/g, "");
    if (code.length !== 6) throw new Error("Enter the 6-digit code from the app.");
    return { code };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const twoFactor = await import("./admin-2fa.server");
    return { ok: true as const, backupCodes: await twoFactor.confirmTotpSetup(data.code) };
  });

export const disableAuthenticator = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const twoFactor = await import("./admin-2fa.server");
  await twoFactor.disableTotp();
  return { ok: true as const };
});

export const saveSecurityEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => {
    const email = (data?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    return { email };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const twoFactor = await import("./admin-2fa.server");
    await twoFactor.setNotifyEmail(data.email);
    return { ok: true as const };
  });

export const revokeTrustedBrowsers = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const twoFactor = await import("./admin-2fa.server");
  const removed = await twoFactor.revokeAllDevices();
  return { ok: true as const, removed };
});

export const forgetThisBrowser = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const twoFactor = await import("./admin-2fa.server");
  await twoFactor.forgetThisDevice();
  return { ok: true as const };
});
