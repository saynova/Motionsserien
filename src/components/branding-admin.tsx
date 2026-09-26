import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brandingQueryOptions, saveBranding } from "@/lib/branding.functions";

export function BrandingAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery(brandingQueryOptions());
  const save = useServerFn(saveBranding);
  const [form, setForm] = useState({ headerTitle: "", headerSubtitle: "", tournamentName: "", showSignIn: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const onSave = async () => {
    setBusy(true);
    try {
      await save({ data: form });
      await qc.invalidateQueries({ queryKey: ["site-branding"] });
      toast.success("Site name saved — it now shows everywhere on the website.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const field = (key: "headerTitle" | "headerSubtitle" | "tournamentName", label: string, hint: string) => (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      <span className="block text-xs text-muted-foreground">{hint}</span>
    </label>
  );


  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Site name &amp; tournament</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Change the website header and tournament name for a new season. Saved changes appear on
          every page, on phones and computers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("headerTitle", "Header title", "Coloured first part of the header, e.g. Motionsserien")}
        {field("headerSubtitle", "Header subtitle", "Second part next to it, e.g. HT-26 (can be empty)")}
      </div>
      {field("tournamentName", "Tournament name", "Used in page titles, admin and emails, e.g. Motionsserien HT-26")}
      <div className="rounded-xl border border-border p-4">
        <label className="flex items-start gap-3">
          <Switch
            checked={form.showSignIn}
            onCheckedChange={(v) => setForm({ ...form, showSignIn: v })}
          />
          <span>
            <span className="block text-sm font-semibold">Show the Sign in button in the header</span>
            <span className="block text-xs text-muted-foreground">
              Turn this off while players don&apos;t need accounts. Turn it on when receipts open or
              when registration for the next tournament starts.
            </span>
          </span>
        </label>
      </div>
      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Header preview</p>
        <p className="mt-1 font-display text-2xl font-bold">
          <span className="text-primary">{form.headerTitle}</span> {form.headerSubtitle}
        </p>
      </div>

      <Button onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save site name"}</Button>
    </section>
  );
}
