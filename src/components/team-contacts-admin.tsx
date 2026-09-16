import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { teamContactsQueryOptions } from "@/lib/tournament-query";
import { saveTeamContacts, type TeamContact } from "@/lib/reminders.functions";

const control = "w-full rounded border border-input bg-background px-2 py-1.5 text-sm";
const btnGhost =
  "rounded border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70 disabled:opacity-40";

export function TeamContactsAdmin() {
  const contacts = useQuery(teamContactsQueryOptions);
  const [open, setOpen] = useState(false);
  const rows = contacts.data ?? [];
  const withEmail = rows.filter((r) => r.player1Email || r.player2Email).length;

  return (
    <section className="mt-10 rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-6 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wide">Team contacts</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Player names and emails used for missing-score reminders. Never shown publicly.
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {withEmail} of {rows.length} teams have contacts · {open ? "Hide" : "Show"}
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border p-6">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            rows.map((row) => <ContactRow key={row.teamId} row={row} />)
          )}
        </div>
      ) : null}
    </section>
  );
}

function ContactRow({ row }: { row: TeamContact }) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveTeamContacts);
  const [fields, setFields] = useState({
    player1Name: row.player1Name,
    player1Email: row.player1Email,
    player2Name: row.player2Name,
    player2Email: row.player2Email,
  });
  const [busy, setBusy] = useState(false);

  async function persist() {
    setBusy(true);
    try {
      await save({ data: { teamId: row.teamId, ...fields } });
      await queryClient.invalidateQueries({ queryKey: ["team-contacts", "admin"] });
      toast.success(`Contacts saved for ${row.teamName}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save contacts.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border border-border bg-background/40 p-3">
      <p className="font-semibold">{row.teamName}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["player1Name", "Player 1 name"],
            ["player1Email", "Player 1 email"],
            ["player2Name", "Player 2 name"],
            ["player2Email", "Player 2 email"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="space-y-1">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </span>
            <input
              className={control}
              value={fields[key]}
              onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <button className={`${btnGhost} mt-3`} disabled={busy} onClick={persist}>
        {busy ? "Saving…" : "Save contacts"}
      </button>
    </div>
  );
}
