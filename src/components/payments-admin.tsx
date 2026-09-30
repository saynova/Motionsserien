import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BellRing, CheckCheck, CheckCircle2, CircleAlert, Search, Wallet } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AdminSendReceipt } from "@/components/admin-send-receipt";
import { Switch } from "@/components/ui/switch";
import { teamPaymentsQueryOptions } from "@/lib/tournament-query";
import { bulkSetPaid, remindAllUnpaid, saveTeamPayment, sendPaymentReminder } from "@/lib/payments.functions";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PaymentsAdmin() {
  const queryClient = useQueryClient();
  const payments = useQuery(teamPaymentsQueryOptions);
  const save = useServerFn(saveTeamPayment);
  const remind = useServerFn(sendPaymentReminder);
  const remindAll = useServerFn(remindAllUnpaid);

  const [busyTeam, setBusyTeam] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const bulk = useServerFn(bulkSetPaid);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyBulk, setBusyBulk] = useState(false);

  const allRows = payments.data?.rows ?? [];
  const rows = allRows;
  const shown = allRows.filter(
    (row) =>
      row.teamName.toLowerCase().includes(search.trim().toLowerCase()) &&
      (filter === "all" || (filter === "paid" ? row.isPaid : !row.isPaid)),
  );
  const shownUnpaid = shown.filter((row) => !row.isPaid);
  const selectedUnpaid = allRows.filter((row) => selected.has(row.teamId) && !row.isPaid);
  const allShownSelected = shownUnpaid.length > 0 && shownUnpaid.every((r) => selected.has(r.teamId));

  function toggleSelect(teamId: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(teamId);
      else next.delete(teamId);
      return next;
    });
  }

  async function markPaid(ids: string[]) {
    if (ids.length === 0) return;
    if (!window.confirm(`Mark ${ids.length} team${ids.length === 1 ? "" : "s"} as paid?`)) return;
    setBusyBulk(true);
    try {
      await bulk({ data: { teamIds: ids } });
      setSelected(new Set());
      await refresh();
      toast.success(`${ids.length} team${ids.length === 1 ? "" : "s"} marked as paid.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update payments.");
    } finally {
      setBusyBulk(false);
    }
  }
  const paid = rows.filter((row) => row.isPaid).length;
  const due = rows.length - paid;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["team-payments", "admin"] });
  }

  async function togglePaid(teamId: string, isPaid: boolean, note: string) {
    setBusyTeam(teamId);
    try {
      await save({ data: { teamId, isPaid, note } });
      await refresh();
      toast.success(isPaid ? "Marked as paid." : "Marked as unpaid.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusyTeam(null);
    }
  }

  async function saveNote(teamId: string, isPaid: boolean, note: string) {
    setBusyTeam(teamId);
    try {
      await save({ data: { teamId, isPaid, note } });
      await refresh();
      toast.success("Note saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the note.");
    } finally {
      setBusyTeam(null);
    }
  }

  async function sendOne(teamId: string) {
    setBusyTeam(teamId);
    try {
      const result = await remind({ data: { teamId } });
      await refresh();
      toast.success(
        result.sent > 0
          ? `Payment reminder sent to ${result.sent} player${result.sent === 1 ? "" : "s"}.`
          : "No reminder delivered — those addresses are blocked.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reminder.");
    } finally {
      setBusyTeam(null);
    }
  }

  async function sendAll() {
    setBusyAll(true);
    try {
      const result = await remindAll();
      await refresh();
      toast.success(
        `Payment reminder sent to ${result.teams} team${result.teams === 1 ? "" : "s"} (${result.sent} email${result.sent === 1 ? "" : "s"}).`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reminders.");
    } finally {
      setBusyAll(false);
    }
  }

  return (
    <section className="glass-surface rounded-2xl border border-border p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Wallet className="h-5 w-5 text-primary" />
            Team payments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark which teams have paid the fee for {payments.data?.seasonName ?? "this season"} and
            send a bilingual reminder to the teams still due.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {paid} paid
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700">
            <CircleAlert className="h-3.5 w-3.5" /> {due} due
          </span>
          <Button size="sm" variant="outline" disabled={busyAll || due === 0} onClick={sendAll}>
            <BellRing className="mr-1.5 h-4 w-4" />
            Remind all unpaid
          </Button>
        </div>
      </header>

      {payments.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading teams…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No teams in the running season yet.</p>
      ) : (
        <>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by team name"
              aria-label="Filter by team name"
              className="w-full rounded-lg border border-input bg-card py-2 pl-8 pr-3 text-sm"
            />
          </div>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {(["all", "paid", "unpaid"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allShownSelected}
              disabled={shownUnpaid.length === 0}
              onCheckedChange={(on) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  shownUnpaid.forEach((r) => (on ? next.add(r.teamId) : next.delete(r.teamId)));
                  return next;
                })
              }
            />
            Select all shown unpaid
          </label>
          <span className="text-xs text-muted-foreground">{selectedUnpaid.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" disabled={busyBulk || selectedUnpaid.length === 0} onClick={() => markPaid(selectedUnpaid.map((r) => r.teamId))}>
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark selected as paid
            </Button>
            <Button size="sm" variant="outline" disabled={busyBulk || due === 0} onClick={() => markPaid(allRows.filter((r) => !r.isPaid).map((r) => r.teamId))}>
              Mark all unpaid as paid
            </Button>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No teams match this filter.</p>
        ) : null}
        <ul className="mt-3 space-y-2">
          {shown.map((row) => {
            const note = notes[row.teamId] ?? row.note;
            const busy = busyTeam === row.teamId;
            return (
              <li
                key={row.teamId}
                className="rounded-xl border border-border bg-card/60 p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <Checkbox
                    checked={selected.has(row.teamId)}
                    disabled={row.isPaid}
                    onCheckedChange={(on) => toggleSelect(row.teamId, on === true)}
                    aria-label={`Select ${row.teamName}`}
                  />
                  <div className="min-w-[10rem] flex-1">
                    <p className="font-semibold">{row.teamName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.division ? `Division ${row.division}` : "Not placed"} ·{" "}
                      {row.contacts === 0 ? "no email saved" : `${row.contacts} email(s)`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={row.isPaid}
                      disabled={busy}
                      onCheckedChange={(checked) => togglePaid(row.teamId, checked, note)}
                      aria-label={`Mark ${row.teamName} as paid`}
                    />
                    <span
                      className={`text-xs font-bold uppercase tracking-wide ${
                        row.isPaid ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {row.isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </div>

                  <div className="w-full sm:w-52">
                    <input
                      value={note}
                      onChange={(event) =>
                        setNotes((prev) => ({ ...prev, [row.teamId]: event.target.value }))
                      }
                      onBlur={() => {
                        if (note !== row.note) saveNote(row.teamId, row.isPaid, note);
                      }}
                      placeholder="Note (optional)"
                      className="w-full rounded border border-input bg-card px-3 py-1.5 text-sm"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || row.isPaid || row.contacts === 0}
                    onClick={() => sendOne(row.teamId)}
                  >
                    <BellRing className="mr-1.5 h-4 w-4" />
                    Send reminder
                  </Button>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {row.isPaid && row.paidAt ? `Paid ${formatDate(row.paidAt)}. ` : null}
                  {row.remindedAt
                    ? `Last reminder ${formatDate(row.remindedAt)}.`
                    : "No reminder sent yet."}
                </p>
              </li>
            );
          })}
        </ul>
        </>
      )}
      <AdminSendReceipt />
    </section>
  );
}
