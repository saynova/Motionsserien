import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  deleteOnedayRegistration,
  markOnedaySeen,
  setOnedayStatus,
  updateOnedaySettings,
} from "@/lib/oneday.functions";
import { onedayRegistrationsAdminQueryOptions, onedaySettingsAdminQueryOptions } from "@/lib/oneday-query";

const TABS = [
  { id: "settings", label: "Event settings" },
  { id: "registrations", label: "Registrations" },
] as const;

export function OnedayAdmin() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("registrations");
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">One day tournament</h2>
        <p className="text-sm text-muted-foreground">
          Separate from the weekly series. Nothing here affects the current tournament.
        </p>
      </div>
      <div className="inline-flex rounded-lg border border-border bg-card p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "settings" ? <SettingsTab /> : <RegistrationsTab />}
    </div>
  );
}

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground";

function SettingsTab() {
  const { data } = useQuery(onedaySettingsAdminQueryOptions);
  const save = useServerFn(updateOnedaySettings);
  const qc = useQueryClient();
  const [form, setForm] = useState({ visible: false, isOpen: false, name: "", eventDate: "", venue: "", paymentDetails: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  async function onSave() {
    setBusy(true);
    try {
      await save({ data: form });
      toast.success("One-day settings saved");
      void qc.invalidateQueries({ queryKey: ["oneday"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Show the event</p>
          <p className="text-xs text-muted-foreground">Shows the One-day page and its menu link.</p>
        </div>
        <Switch checked={form.visible} onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Registration open</p>
          <p className="text-xs text-muted-foreground">When off, the page says "Registration is closed".</p>
        </div>
        <Switch checked={form.isOpen} onCheckedChange={(v) => setForm((f) => ({ ...f, isOpen: v }))} />
      </div>
      <div>
        <label className={labelCls}>Event name</label>
        <input className={field} maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Date &amp; start time</label>
          <input type="datetime-local" className={field} value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Venue</label>
          <input className={field} maxLength={160} value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Fee &amp; Swish details (leave empty to hide)</label>
        <textarea className={`${field} min-h-24`} maxLength={1000} value={form.paymentDetails} onChange={(e) => setForm((f) => ({ ...f, paymentDetails: e.target.value }))} />
      </div>
      <Button onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
    </section>
  );
}

function RegistrationsTab() {
  const { data = [] } = useQuery(onedayRegistrationsAdminQueryOptions);
  const qc = useQueryClient();
  const setStatus = useServerFn(setOnedayStatus);
  const remove = useServerFn(deleteOnedayRegistration);
  const markSeen = useServerFn(markOnedaySeen);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const unseen = data.some((r) => !r.seen_by_admin);
  useEffect(() => {
    if (unseen) void markSeen().then(() => qc.invalidateQueries({ queryKey: ["oneday", "badge"] }));
  }, [unseen, markSeen, qc]);

  const counts = {
    all: data.length,
    pending: data.filter((r) => r.status === "pending").length,
    approved: data.filter((r) => r.status === "approved").length,
    rejected: data.filter((r) => r.status === "rejected").length,
  };
  const rows = filter === "all" ? data : data.filter((r) => r.status === filter);

  async function act(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      void qc.invalidateQueries({ queryKey: ["oneday"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        {(Object.keys(counts) as (keyof typeof counts)[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${filter === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {k} ({counts[k]})
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">No registrations here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Players</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 align-top last:border-0">
                  <td className="px-3 py-2 font-semibold">
                    {r.team_name}
                    <div className="text-xs font-normal text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })}
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.player1_name} &amp; {r.player2_name}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{r.email}</div>
                    <div className="text-muted-foreground">{r.phone}</div>
                  </td>
                  <td className="px-3 py-2 capitalize">{r.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {r.status !== "approved" ? (
                        <Button size="sm" onClick={() => act(() => setStatus({ data: { id: r.id, status: "approved" } }), "Approved")}>Approve</Button>
                      ) : null}
                      {r.status !== "rejected" ? (
                        <Button size="sm" variant="outline" onClick={() => act(() => setStatus({ data: { id: r.id, status: "rejected" } }), "Rejected")}>Reject</Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete ${r.team_name}?`)) void act(() => remove({ data: { id: r.id } }), "Deleted");
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
