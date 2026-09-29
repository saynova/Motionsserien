import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/tournament-ui";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthSessionFromUrl } from "@/lib/auth-url-session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Motionsserien badminton" },
      { name: "description", content: "Sign in or create your player account to register a team, submit scores and get your receipt." },
      { property: "og:title", content: "Sign in — Motionsserien badminton" },
      { property: "og:description", content: "One player account for registration, scores and receipts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const field = "w-full rounded border border-input bg-card px-3 py-2 text-sm";
const label = "mb-1 block text-xs uppercase tracking-widest text-muted-foreground";
const SPAM_NOTE = "If you can't find it, please check your junk or spam folder.";

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    consumeAuthSessionFromUrl()
      .then(() => supabase.auth.getSession())
      .then(({ data }) => {
        if (data.session) navigate({ to: "/account", replace: true });
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "This sign-in link could not be completed.");
      });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/account", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  function switchMode(next: Mode) {
    setMode(next);
    setSent(null);
    setVerifying(false);
    setCode("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        if (!agreed) throw new Error("Please accept the Terms and Conditions to continue.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim(), terms_accepted: true } },
        });
        // An address that already has an account gets no new code email, so
        // never show the code screen for it — send the visitor to Sign In.
        const alreadyRegistered =
          error?.code === "user_already_exists" ||
          /already registered|already exists/i.test(error?.message ?? "") ||
          (!error && data.user !== null && (data.user.identities?.length ?? 0) === 0);
        if (alreadyRegistered) {
          setMode("signin");
          setPassword("");
          throw new Error(
            "An account with this email already exists. Please sign in below, or use “Forgot password?” to set a new one.",
          );
        }
        if (error) throw error;
        setVerifying(true);
        toast.success("We've emailed you a verification code.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("We've sent you an email with a link to choose a new password.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const token = code.replace(/\D/g, "");
      if (token.length < 6) throw new Error("Please enter the full code from your email.");
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
      if (error) throw error;
      toast.success("Your account is verified.");
      navigate({ to: "/account", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("A new code is on its way.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send a new code.");
    } finally {
      setBusy(false);
    }
  }

  const tab = (value: Mode, text: string) => (
    <button
      type="button"
      onClick={() => switchMode(value)}
      className={`flex-1 rounded px-4 py-2 text-sm font-bold transition ${
        mode === value
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-foreground hover:bg-secondary/70"
      }`}
    >
      {text}
    </button>
  );

  return (
    <>
      <PageHeader
        eyebrow="Player account"
        title={mode === "signup" ? "Create account" : mode === "forgot" ? "Forgot password" : "Sign in"}
        description="One account for team registration, score submission and receipts — for this and every future tournament."
      />
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-card p-5">
        {verifying ? (
          <form onSubmit={onVerify} className="space-y-3">
            <div className="rounded border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-semibold">Enter your verification code</p>
              <p className="mt-1">
                We sent a verification code to <strong>{email}</strong>. Type it below to finish creating your
                account — there is no link to click. <strong>{SPAM_NOTE}</strong>
              </p>
            </div>
            <div>
              <label className={label} htmlFor="code">Verification code</label>
              <input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                className={`${field} text-center text-xl font-bold tracking-[0.25em] sm:text-2xl sm:tracking-[0.3em]`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={busy} className="w-full rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40">
              {busy ? "Please wait…" : "Verify my account"}
            </button>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <button type="button" className="text-primary underline" onClick={resendCode} disabled={busy}>
                Send a new code
              </button>
              <button type="button" className="text-muted-foreground underline" onClick={() => switchMode("signin")}>
                Back to sign in
              </button>
            </div>
          </form>
        ) : sent ? (
          <div className="space-y-2 rounded border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="font-semibold">{sent}</p>
            <p>
              <strong>{SPAM_NOTE}</strong>
            </p>
            <button className="text-primary underline" onClick={() => switchMode("signin")}>
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 rounded-lg border border-border bg-background p-1">
              {tab("signin", "Sign In")}
              {tab("signup", "Sign Up")}
            </div>
            <form onSubmit={onSubmit} className="space-y-3" method="post" action="#">
              {mode === "signup" ? (
                <div>
                  <label className={label} htmlFor="name">Full name</label>
                  <input id="name" name="name" type="text" autoComplete="name" className={field} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              ) : null}
              <div>
                <label className={label} htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete={mode === "signup" ? "email" : "username"} className={field} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {mode !== "forgot" ? (
                <div>
                  <label className={label} htmlFor="password">Password</label>
                  <input id="password" name="password" type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} className={field} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{SPAM_NOTE}</p>
              )}
              {mode === "signup" ? (
                <>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      required
                    />
                    <span>
                      I have read and agree to the{" "}
                      <Link to="/terms" className="font-semibold text-primary underline">
                        Terms and Conditions
                      </Link>
                      .
                    </span>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    We'll email you a verification code to confirm your address. {SPAM_NOTE}
                  </p>
                </>
              ) : null}
              <button
                type="submit"
                disabled={busy || (mode === "signup" && !agreed)}
                className="w-full rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
              </button>
            </form>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              {mode === "forgot" ? (
                <button className="text-primary underline" onClick={() => switchMode("signin")}>
                  Back to sign in
                </button>
              ) : (
                <button className="text-muted-foreground underline" onClick={() => switchMode("forgot")}>
                  Forgot password?
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
