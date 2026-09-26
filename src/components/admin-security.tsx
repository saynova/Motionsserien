import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Laptop, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  confirmAuthenticatorSetup,
  disableAuthenticator,
  forgetThisBrowser,
  getSecurityStatus,
  revokeTrustedBrowsers,
  saveSecurityEmail,
  startAuthenticatorSetup,
} from "@/lib/admin-2fa.functions";

const card = "rounded-lg border border-border bg-card p-4";
const control = "rounded border border-input bg-card px-3 py-2 text-sm font-medium";

export function SecurityAdmin() {
  const qc = useQueryClient();
  const status = useServerFn(getSecurityStatus);
  const startSetup = useServerFn(startAuthenticatorSetup);
  const confirmSetup = useServerFn(confirmAuthenticatorSetup);
  const disable = useServerFn(disableAuthenticator);
  const saveEmail = useServerFn(saveSecurityEmail);
  const revokeAll = useServerFn(revokeTrustedBrowsers);
  const forget = useServerFn(forgetThisBrowser);

  const { data, isLoading } = useQuery({ queryKey: ["admin-security"], queryFn: () => status() });

  const [email, setEmail] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-security"] });

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onStartSetup() {
    setBusy(true);
    try {
      const result = await startSetup();
      const QRCode = (await import("qrcode")).default;
      const qr = await QRCode.toDataURL(result.uri, { width: 240, margin: 1 });
      setSetup({ ...result, qr });
      setBackupCodes(null);
      setCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the setup.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmSetup() {
    setBusy(true);
    try {
      const result = await confirmSetup({ data: { code } });
      setBackupCodes(result.backupCodes);
      setSetup(null);
      setCode("");
      toast.success("Authenticator app is now active.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That code did not match.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading security settings…</p>;
  }

  const emailValue = email ?? data.notifyEmail;

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Two-step sign-in</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          A new browser always needs a 6-digit code after the admin password. A browser you
          trust is remembered for {data.trustDays} days and goes straight in.
        </p>
      </div>

      <div className={card}>
        <h3 className="font-semibold">Where codes are sent</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign-in codes are emailed to this address.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="email"
            className={`${control} min-w-[260px] flex-1`}
            value={emailValue}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            disabled={busy || emailValue === data.notifyEmail}
            onClick={() => act(() => saveEmail({ data: { email: emailValue } }), "Email saved.")}
          >
            Save
          </Button>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Authenticator app (backup)</h3>
        </div>
        {data.totpEnabled ? (
          <>
            <p className="mt-1 text-sm text-emerald-600">
              Active — you can use your app's code instead of waiting for the email.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Emergency backup codes left: {data.backupCodesLeft}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy} onClick={onStartSetup}>
                Set up again
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => act(() => disable(), "Authenticator app turned off.")}
              >
                Turn off
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Not set up yet. Add it so you can sign in even when email is slow or unavailable.
            </p>
            <Button className="mt-3" disabled={busy} onClick={onStartSetup}>
              Set up authenticator app
            </Button>
          </>
        )}

        {setup ? (
          <div className="mt-4 space-y-3 rounded-lg border border-border bg-secondary/40 p-4">
            <p className="text-sm font-semibold">1. Scan this with your authenticator app</p>
            <img src={setup.qr} alt="Authenticator QR code" className="h-40 w-40 rounded bg-white p-2" />
            <p className="text-xs text-muted-foreground">
              Can't scan? Enter this key by hand:
              <span className="ml-1 font-mono tracking-wider">{setup.secret}</span>
            </p>
            <p className="text-sm font-semibold">2. Enter the 6-digit code it shows</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                inputMode="numeric"
                maxLength={6}
                className={`${control} w-32 text-center tracking-[0.3em]`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button disabled={busy || code.length !== 6} onClick={onConfirmSetup}>
                Confirm
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setSetup(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {backupCodes ? (
          <div className="mt-4 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Save these emergency codes now — each one works once.
            </p>
            <div className="grid grid-cols-2 gap-1 font-mono text-sm text-amber-900 sm:grid-cols-4">
              {backupCodes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(backupCodes.join("\n"));
                toast.success("Codes copied.");
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copy all
            </Button>
          </div>
        ) : null}
      </div>

      <div className={card}>
        <div className="flex items-center gap-2">
          <Laptop className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Trusted browsers</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.thisBrowserTrusted
            ? "This browser is trusted, so it skips the code."
            : "This browser is not trusted yet."}
        </p>
        {data.devices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No trusted browsers.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {data.devices.map((d) => (
              <li key={d.id} className="flex flex-wrap justify-between gap-2 rounded border border-border px-3 py-2">
                <span className="font-medium">{d.label}</span>
                <span className="text-muted-foreground">
                  Last used {new Date(d.lastUsedAt).toLocaleDateString()} · expires{" "}
                  {new Date(d.expiresAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {data.thisBrowserTrusted ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => act(() => forget(), "This browser will ask for a code next time.")}
            >
              Stop trusting this browser
            </Button>
          ) : null}
          <Button
            variant="destructive"
            disabled={busy || data.devices.length === 0}
            onClick={() => act(() => revokeAll(), "All trusted browsers removed.")}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Revoke all
          </Button>
        </div>
      </div>
    </div>
  );
}
