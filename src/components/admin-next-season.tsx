import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DIVISION_COUNT, TEAMS_PER_DIVISION } from "@/lib/tournament";
import { validateSeedBoard, type SeedEntry } from "@/lib/seeding";
import {
  adminRegistrationsQueryOptions,
  registrationInfoQueryOptions,
  seedBoardQueryOptions,
  tournamentQueryOptions,
} from "@/lib/tournament-query";
import {
  buildSeedSuggestion,
  deleteRegistration,
  lockSeedingAndStartSeason,
  saveSeedBoard,
  setRegistrationOpen,
  setRegistrationStatus,
  updateSeasonSettings,
  type RegistrationStatus,
} from "@/lib/registration.functions";

const control = "rounded border border-input bg-card px-3 py-2 text-sm font-medium";
const btn =
  "rounded bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40";
const btnGhost =
  "rounded border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70 disabled:opacity-40";

function useRunner() {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  async function run(action: () => Promise<unknown>, success: string, keys: string[][] = []) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      for (const key of keys) await queryClient.invalidateQueries({ queryKey: key });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

// ------------------------------------------------------------ season settings

export function SeasonSettingsCard() {
  const tournament = useQuery(tournamentQueryOptions);
  const info = useQuery(registrationInfoQueryOptions);
  const save = useServerFn(updateSeasonSettings);
  const { busy, run } = useRunner();

  const [name, setName] = useState("");
  const [payment, setPayment] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    if (tournament.data?.season) {
      setName(tournament.data.season.name);
      setPayment(info.data?.paymentDetails ?? "");
      setLoaded(true);
    }
  }, [loaded, tournament.data, info.data]);

  return (
    <section className="mb-8 rounded-lg border border-border bg-card p-5">
      <h2 className="text-2xl font-bold uppercase tracking-wide">Tournament settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Rename the tournament and add payment details players should see. Payment details can be
        left empty and filled in later.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Tournament name
          </span>
          <input
            className={`${control} w-full`}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Payment details (optional)
          </span>
          <textarea
            className={`${control} w-full`}
            rows={3}
            maxLength={1000}
            placeholder="Fee 300 kr per team · Swish 123 456 78 90 · pay before week 1"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          />
        </label>
      </div>
      <button
        className={`${btn} mt-4`}
        disabled={busy || name.trim().length < 3}
        onClick={() =>
          run(() => save({ data: { name, paymentDetails: payment } }), "Settings saved.", [
            ["tournament"],
            ["registration-info"],
          ])
        }
      >
        Save settings
      </button>
    </section>
  );
}

// -------------------------------------------------------- registrations + seeding

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};

export function NextSeasonAdmin() {
  const info = useQuery(registrationInfoQueryOptions);
  const registrations = useQuery(adminRegistrationsQueryOptions);
  const board = useQuery(seedBoardQueryOptions);

  const toggleOpen = useServerFn(setRegistrationOpen);
  const setStatus = useServerFn(setRegistrationStatus);
  const removeReg = useServerFn(deleteRegistration);
  const suggest = useServerFn(buildSeedSuggestion);
  const saveBoard = useServerFn(saveSeedBoard);
  const lock = useServerFn(lockSeedingAndStartSeason);
  const { busy, run } = useRunner();

  const [targetSeason, setTargetSeason] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [entries, setEntries] = useState<SeedEntry[]>([]);
  const [seasonLoaded, setSeasonLoaded] = useState(false);
  const [boardLoaded, setBoardLoaded] = useState(false);

  useEffect(() => {
    if (!seasonLoaded && info.data) {
      setTargetSeason(info.data.targetSeason);
      setSeasonName(info.data.targetSeason);
      setSeasonLoaded(true);
    }
  }, [seasonLoaded, info.data]);

  useEffect(() => {
    if (!boardLoaded && board.data) {
      setEntries(board.data.entries);
      setBoardLoaded(true);
    }
  }, [boardLoaded, board.data]);

  const rows = registrations.data ?? [];
  const accepted = rows.filter((r) => r.status === "accepted");
  const acceptedNames = accepted.map((r) => r.team_name);
  const issues = validateSeedBoard(entries, acceptedNames.slice(0, DIVISION_COUNT * TEAMS_PER_DIVISION));

  const totalSlots = DIVISION_COUNT * TEAMS_PER_DIVISION;
  const filledSlots = entries.length;
  const placedLower = new Set(entries.map((e) => e.teamName.toLowerCase()));
  const unplaced = acceptedNames.filter((n) => !placedLower.has(n.toLowerCase()));
  const incompleteDivisions = Array.from(
    { length: DIVISION_COUNT },
    (_, i) => i + 1,
  ).filter((d) => entries.filter((e) => e.division === d).length !== TEAMS_PER_DIVISION);

  function teamAt(division: number, position: number): string {
    return entries.find((e) => e.division === division && e.position === position)?.teamName ?? "";
  }

  function setSlot(division: number, position: number, teamName: string) {
    setEntries((prev) => {
      const next = prev.filter((e) => !(e.division === division && e.position === position));
      if (!teamName) return next;
      // If the team sits elsewhere, swap it with whoever was in this slot.
      const previousOwner = prev.find(
        (e) => e.teamName.toLowerCase() === teamName.toLowerCase(),
      );
      const displaced = prev.find((e) => e.division === division && e.position === position);
      const cleaned = next.filter((e) => e.teamName.toLowerCase() !== teamName.toLowerCase());
      const result = [...cleaned, { teamName, division, position }];
      if (previousOwner && displaced) {
        result.push({
          teamName: displaced.teamName,
          division: previousOwner.division,
          position: previousOwner.position,
        });
      }
      return result.sort((a, b) => a.division - b.division || a.position - b.position);
    });
  }

  function moveTeam(division: number, position: number, direction: -1 | 1) {
    const target = division + direction;
    if (target < 1 || target > DIVISION_COUNT) return;
    const teamName = teamAt(division, position);
    if (!teamName) return;
    // Reuses the swap logic: placing the team into the occupied slot swaps the two.
    setSlot(target, position, teamName);
  }

  return (
    <section className="mt-10 space-y-6 rounded-lg border border-border bg-card p-5">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wide">Next season</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Open registration, accept 30 teams, arrange the divisions, then lock the seeding to start
          the new season from week 1.
        </p>
      </div>

      {/* registration toggle */}
      <div className="flex flex-wrap items-end gap-3 rounded border border-border bg-secondary/30 p-4">
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Season label for registration
          </span>
          <input
            className={control}
            value={targetSeason}
            maxLength={60}
            placeholder="Motionsserien VT-27"
            onChange={(e) => setTargetSeason(e.target.value)}
          />
        </label>
        <button
          className={btn}
          disabled={busy}
          onClick={() =>
            run(
              () => toggleOpen({ data: { isOpen: true, targetSeason } }),
              "Registration is open.",
              [["registration-info"]],
            )
          }
        >
          Open registration
        </button>
        <button
          className={btnGhost}
          disabled={busy}
          onClick={() =>
            run(
              () => toggleOpen({ data: { isOpen: false, targetSeason } }),
              "Registration closed.",
              [["registration-info"]],
            )
          }
        >
          Close registration
        </button>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {info.data?.isOpen ? "Currently open" : "Currently closed"} · {accepted.length}/30 accepted
        </span>
      </div>

      {/* registrations table */}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Team</th>
              <th className="px-3 py-2 text-left font-semibold">Players</th>
              <th className="px-3 py-2 text-left font-semibold">Prev.</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-sm text-muted-foreground" colSpan={5}>
                  No registrations yet.
                </td>
              </tr>
            ) : (
              rows.map((reg) => (
                <tr key={reg.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 font-semibold">
                    {reg.team_name}
                    {reg.phone ? (
                      <span className="block text-xs text-muted-foreground">{reg.phone}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {reg.player1_name} · {reg.player1_email}
                    <br />
                    {reg.player2_name} · {reg.player2_email}
                  </td>
                  <td className="tabnum px-3 py-2">
                    {reg.previous_division ? `Div ${reg.previous_division}` : "New"}
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                    {STATUS_LABEL[reg.status] ?? reg.status}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {(["accepted", "waitlisted", "rejected"] as RegistrationStatus[]).map((s) => (
                        <button
                          key={s}
                          className={btnGhost}
                          disabled={busy || reg.status === s}
                          onClick={() =>
                            run(
                              () => setStatus({ data: { id: reg.id, status: s } }),
                              `${reg.team_name} marked ${STATUS_LABEL[s]}.`,
                              [["registrations", "admin"], ["registered-teams"], ["seed-board", "admin"]],
                            )
                          }
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                      <button
                        className={btnGhost}
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => removeReg({ data: { id: reg.id } }),
                            "Registration removed.",
                            [["registrations", "admin"], ["registered-teams"], ["seed-board", "admin"]],
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* seeding board */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-bold uppercase tracking-wide">Seeding board</h3>
          <button
            className={btnGhost}
            disabled={busy || acceptedNames.length === 0}
            onClick={() =>
              run(
                async () => {
                  const result = await suggest({ data: undefined });
                  setEntries(result.entries);
                },
                "Suggested divisions ready — adjust as you like.",
                [["seed-board", "admin"]],
              )
            }
          >
            Suggest divisions
          </button>
          <button
            className={btnGhost}
            disabled={busy}
            onClick={() =>
              run(() => saveBoard({ data: { entries } }), "Seeding board saved.", [
                ["seed-board", "admin"],
                ["registered-teams"],
              ])
            }
          >
            Save board
          </button>
          <button
            className={btnGhost}
            disabled={busy || entries.length === 0}
            onClick={() => {
              setEntries([]);
              toast.success("Board cleared.");
            }}
          >
            Clear board
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Pick any team in a slot — if it is already placed elsewhere, the two teams swap. Use the
          arrows to move a team one division up or down.
        </p>

        {acceptedNames.length === 0 ? (
          <p className="rounded border border-border bg-secondary/30 p-3 text-xs font-semibold text-muted-foreground">
            No accepted teams yet — accept teams above, then press Suggest divisions.
          </p>
        ) : issues.length > 0 ? (
          <div className="rounded border border-down/40 bg-down/10 p-3">
            <p className="text-xs font-bold text-down">
              {filledSlots} of {totalSlots} slots filled — {incompleteDivisions.length} division
              {incompleteDivisions.length === 1 ? "" : "s"} still need
              {incompleteDivisions.length === 1 ? "s" : ""} teams.
            </p>
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto pr-1 text-xs font-semibold text-down">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-widest text-up">
            Board is complete — 10 divisions × 3 teams.
          </p>
        )}

        {unplaced.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded border border-border bg-secondary/30 p-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Not placed yet
            </span>
            {unplaced.map((name) => (
              <span
                key={name}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold"
              >
                {name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: DIVISION_COUNT }, (_, i) => i + 1).map((division) => {
            const count = entries.filter((e) => e.division === division).length;
            return (
              <div key={division} className="rounded border border-border bg-secondary/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-primary">
                    Division {division}
                  </h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabnum ${
                      count === TEAMS_PER_DIVISION
                        ? "bg-up/15 text-up"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {count}/{TEAMS_PER_DIVISION}
                  </span>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: TEAMS_PER_DIVISION }, (_, i) => i + 1).map((position) => {
                    const placed = teamAt(division, position);
                    return (
                      <div key={position} className="flex items-center gap-1.5">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            aria-label="Move up one division"
                            className="rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20"
                            disabled={!placed || division === 1}
                            onClick={() => moveTeam(division, position, -1)}
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Move down one division"
                            className="rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20"
                            disabled={!placed || division === DIVISION_COUNT}
                            onClick={() => moveTeam(division, position, 1)}
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </div>
                        <select
                          className={`${control} min-w-0 flex-1`}
                          value={placed}
                          onChange={(e) => setSlot(division, position, e.target.value)}
                        >
                          <option value="">— pick a team —</option>
                          {acceptedNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* lock and start */}
      <div className="flex flex-wrap items-end gap-3 rounded border border-border bg-secondary/30 p-4">
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            New season name
          </span>
          <input
            className={control}
            value={seasonName}
            placeholder="Motionsserien VT-27"
            onChange={(e) => setSeasonName(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Starting Monday
          </span>
          <input
            type="date"
            className={control}
            value={seasonStart}
            onChange={(e) => setSeasonStart(e.target.value)}
          />
        </label>
        <button
          className={btn}
          disabled={busy || issues.length > 0 || !seasonName || !seasonStart}
          onClick={() =>
            run(
              async () => {
                await saveBoard({ data: { entries } });
                await lock({ data: { name: seasonName, startMonday: seasonStart } });
              },
              "New season started with week 1 scheduled.",
              [["tournament"], ["registration-info"], ["seed-board", "admin"], ["registered-teams"]],
            )
          }
        >
          Lock seeding & start season
        </button>
      </div>
    </section>
  );
}
