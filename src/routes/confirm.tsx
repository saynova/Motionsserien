import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/tournament-ui";
import { supabase } from "@/integrations/supabase/client";

type Search = { token: string | undefined; email: string | undefined; type: string | undefined };

export const Route = createFileRoute("/confirm")({
  head: () => ({
    meta: [
      { title: "Email confirmed — Motionsserien badminton" },
      {
        name: "description",
        content: "Your email address is confirmed and your Motionsserien player account is now active.",
      },
      { property: "og:title", content: "Email confirmed — Motionsserien badminton" },
      { property: "og:description", content: "Your player account for Motionsserien is now active." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
    email: typeof search["email"] === "string" ? search["email"] : undefined,
    type: typeof search["type"] === "string" ? search["type"] : undefined,
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token, email, type } = Route.useSearch();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token || !email) {
        // Arriving with an already-established session is also a success.
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setState("ok");
          return;
        }
        setState("error");
        setMessage("This confirmation link is incomplete. Please open the newest email we sent you.");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type === "email_change" ? "email_change" : "signup",
      });
      if (cancelled) return;
      if (error) {
        setState("error");
        setMessage(
          error.message.toLowerCase().includes("expired")
            ? "This confirmation link has expired. Please sign in again to get a new one."
            : "We could not confirm this link. It may already have been used.",
        );
        return;
      }
      setState("ok");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, email, type]);

  return (
    <>
      <PageHeader eyebrow="Player account" title="Email confirmation" description="" />
      <div className="mx-auto max-w-md space-y-3 rounded-lg border border-border bg-card p-6 text-center">
        {state === "working" ? (
          <p className="text-sm text-muted-foreground">Confirming your email…</p>
        ) : null}

        {state === "ok" ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700">
              ✓
            </div>
            <h2 className="text-xl font-bold">Your email has been confirmed</h2>
            <p className="text-sm text-muted-foreground">
              Your player account on <strong>motionsserien.se</strong> is now active. You can use it for team
              registration, score submission and your receipt — in this and every future tournament.
            </p>
            <Link
              to="/account"
              className="inline-block rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Go to My account
            </Link>
          </>
        ) : null}

        {state === "error" ? (
          <>
            <h2 className="text-xl font-bold">We couldn&apos;t confirm your email</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link
              to="/auth"
              className="inline-block rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Back to sign in
            </Link>
          </>
        ) : null}
      </div>
    </>
  );
}
