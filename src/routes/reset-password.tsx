import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/tournament-ui";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Motionsserien" },
      { name: "description", content: "Set a new password for your Motionsserien player account." },
      { property: "og:title", content: "Choose a new password — Motionsserien" },
      { property: "og:description", content: "Set a new password for your player account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/account", replace: true });
  }

  return (
    <>
      <PageHeader eyebrow="Player account" title="Choose a new password" description="Enter your new password below." />
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-3 rounded-lg border border-border bg-card p-5">
        <input type="email" name="email" autoComplete="username" className="hidden" readOnly />
        <input type="password" name="new-password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-input bg-card px-3 py-2 text-sm" placeholder="New password" />
        <button disabled={busy} className="w-full rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40">
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </>
  );
}
