import { CalendarDays, ChartNoAxesCombined, Swords, Trophy, UserRound, Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  computeStandings,
  formatWeekDate,
  matchSets,
  matchWinnerId,
  type TournamentSnapshot,
} from "@/lib/tournament";

type Props = {
  data: TournamentSnapshot;
  teamId: string | null;
  onClose: () => void;
};

function teamScore(match: TournamentSnapshot["matches"][number], teamId: string) {
  const isA = match.team_a_id === teamId;
  const sets = matchSets(match);
  return sets.length
    ? sets.map((set) => (isA ? `${set.a}–${set.b}` : `${set.b}–${set.a}`)).join("  ")
    : "No result";
}

export function TeamDetailsDialog({ data, teamId, onClose }: Props) {
  const team = data.teams.find((item) => item.id === teamId);
  if (!team) return null;

  const players = data.teamPlayers
    .filter((player) => player.team_id === team.id)
    .sort((a, b) => a.player_no - b.player_no);
  const finalMatches = data.matches
    .filter(
      (match) =>
        match.status === "final" &&
        (match.team_a_id === team.id || match.team_b_id === team.id),
    )
    .sort((a, b) => b.week_no - a.week_no || b.match_no - a.match_no);
  const wins = finalMatches.filter((match) => matchWinnerId(match) === team.id).length;
  const losses = finalMatches.filter((match) => {
    const winner = matchWinnerId(match);
    return winner !== null && winner !== team.id;
  }).length;
  const currentSlots = data.slots.filter((slot) => slot.week_no === data.season.current_week);
  const currentMatches = data.matches.filter((match) => match.week_no === data.season.current_week);
  const currentRow = [...computeStandings(currentSlots, currentMatches, data.teams).values()]
    .flat()
    .find((row) => row.teamId === team.id);
  const teamName = new Map(data.teams.map((item) => [item.id, item.name]));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto border-primary/15 p-0">
        <div className="border-b border-border bg-secondary/60 px-5 py-5 pr-12 sm:px-7">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle className="font-display text-2xl">{team.name}</DialogTitle>
            <DialogDescription>
              Division {currentRow?.division ?? team.start_division}
              {currentRow ? ` · Current rank #${currentRow.rank}` : ""}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-5 pb-6 sm:px-7">
          <section aria-labelledby="players-heading">
            <h3 id="players-heading" className="flex items-center gap-2 text-sm font-bold">
              <UserRound className="size-4 text-primary" aria-hidden="true" /> Players
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {players.length ? players.map((player) => (
                <div key={`${player.team_id}-${player.player_no}`} className="rounded-md border border-border bg-secondary/45 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Player {player.player_no}</p>
                  <p className="mt-0.5 font-semibold">{player.name}</p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Player names are not available yet.</p>
              )}
            </div>
          </section>

          <section aria-labelledby="record-heading">
            <h3 id="record-heading" className="flex items-center gap-2 text-sm font-bold">
              <ChartNoAxesCombined className="size-4 text-primary" aria-hidden="true" /> Season record
            </h3>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Played", finalMatches.length],
                ["Won", wins],
                ["Lost", losses],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border px-3 py-3 text-center">
                  <dd className="tabnum text-xl font-bold text-foreground">{value}</dd>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="form-heading">
            <h3 id="form-heading" className="flex items-center gap-2 text-sm font-bold">
              <Swords className="size-4 text-primary" aria-hidden="true" /> Recent results
            </h3>
            {finalMatches.length ? (
              <ol className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
                {finalMatches.slice(0, 5).map((match) => {
                  const opponentId = match.team_a_id === team.id ? match.team_b_id : match.team_a_id;
                  const winner = matchWinnerId(match);
                  const result = winner === team.id ? "Won" : winner === null ? "Draw" : "Lost";
                  return (
                    <li key={match.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold">vs {teamName.get(opponentId) ?? "Unknown team"}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3" aria-hidden="true" />
                          Week {match.week_no} · {formatWeekDate(data.season.start_monday, match.week_no)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${result === "Won" ? "text-up" : result === "Lost" ? "text-down" : "text-muted-foreground"}`}>
                          {result}
                        </p>
                        <p className="tabnum mt-0.5 text-sm font-semibold">{teamScore(match, team.id)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <Trophy className="size-4" aria-hidden="true" /> No approved results yet.
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}