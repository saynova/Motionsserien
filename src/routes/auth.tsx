import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/tournament-ui";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/account` },
        });
        if (error) throw error;
        setSent("We've sent you a confirmation email. Click the link in it to activate your account.");
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

  async function social(provider: "google" | "apple") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
    if (result && "error" in result && result.error) {
      toast.error(result.error instanceof Error ? result.error.message : "Sign-in failed.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Player account"
        title={mode === "signup" ? "Create account" : mode === "forgot" ? "Forgot password" : "Sign in"}
        description="One account for team registration, score submission and receipts — for this and every future tournament."
      />
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-card p-5">
        {sent ? (
          <div className="space-y-2 rounded border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="font-semibold">{sent}</p>
            <p>
              <strong>{SPAM_NOTE}</strong>
            </p>
            <button className="text-primary underline" onClick={() => { setSent(null); setMode("signin"); }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {mode !== "forgot" ? (
              <div className="grid gap-2">
                <button type="button" onClick={() => social("google")} className="w-full rounded border border-input bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary">
                  Continue with Google
                </button>
                <button type="button" onClick={() => social("apple")} className="w-full rounded border border-input bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90">
                  Continue with Apple
                </button>
                <p className="text-center text-xs text-muted-foreground">or with email</p>
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="space-y-3" method="post" action="#">
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
                <p className="text-xs text-muted-foreground">
                  After signing up, confirm your email from the message we send you. {SPAM_NOTE}
                </p>
              ) : null}
              <button type="submit" disabled={busy} className="w-full rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40">
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
              </button>
            </form>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              {mode === "signin" ? (
                <>
                  <button className="text-primary underline" onClick={() => setMode("signup")}>Create an account</button>
                  <button className="text-muted-foreground underline" onClick={() => setMode("forgot")}>Forgot password?</button>
                </>
              ) : (
                <button className="text-primary underline" onClick={() => setMode("signin")}>I already have an account</button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
