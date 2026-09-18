import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { visitsQueryOptions } from "@/lib/tournament-query";
import { purgeOldVisits } from "@/lib/visitors.functions";

const btnGhost =
  "rounded border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70 disabled:opacity-40";

function when(value: string) {
  return new Date(value).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
}

export function VisitorsAdmin() {
  const visits = useQuery(visitsQueryOptions);
  const queryClient = useQueryClient();
  const purge = useServerFn(purgeOldVisits);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = visits.data ?? [];
  const paths = useMemo(() => [...new Set(rows.map((r) => r.path))].sort(), [rows]);
  const filtered = path === "" ? rows : rows.filter((r) => r.path === path);

  const now = Date.now();
  const since = (ms: number) => rows.filter((r) => now - new Date(r.created_at).getTime() < ms).length;
  const today = since(24 * 60 * 60 * 1000);
  const week = since(7 * 24 * 60 * 60 * 1000);
  const unique = new Set(rows.map((r) => r.ip).filter(Boolean)).size;

  async function onPurge() {
    if (!window.confirm("Delete all visit records older than 30 days?")) return;
    setBusy(true);
    try {
      await purge({});
      await queryClient.invalidateQueries({ queryKey: ["visits", "admin"] });
      toast.success("Old visit records deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete old records.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-surface rounded-xl border border-border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Visitors</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The most recent 400 page visits. Only you can see this.
          </p>
        </div>
        <button className={btnGhost} disabled={busy} onClick={onPurge}>
          Delete logs older than 30 days
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { label: "Last 24 hours", value: today },
          { label: "Last 7 days", value: week },
          { label: "Unique addresses", value: unique },
        ].map((stat) => (
          <span
            key={stat.label}
            className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-semibold"
          >
            <span className="tabnum text-base font-bold text-primary">{stat.value}</span>{" "}
            <span className="text-muted-foreground">{stat.label}</span>
          </span>
        ))}
      </div>

      <label className="mt-4 block space-y-1">
        <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Page
        </span>
        <select
          className="rounded border border-input bg-card px-3 py-2 text-sm font-medium"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        >
          <option value="">All pages</option>
          {paths.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      {visits.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading visits…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No visits recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Page</th>
                <th className="py-2 pr-3">Device</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">IP</th>
                <th className="py-2">Came from</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="tabnum py-2 pr-3 whitespace-nowrap">{when(row.created_at)}</td>
                  <td className="py-2 pr-3">{row.path}</td>
                  <td className="py-2 pr-3">
                    {[row.device, row.os, row.browser].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {[row.city, row.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="tabnum py-2 pr-3">{row.ip || "—"}</td>
                  <td className="py-2 break-all text-muted-foreground">{row.referrer || "Direct"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
