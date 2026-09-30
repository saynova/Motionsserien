import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, History, Swords, Trophy } from "lucide-react";

import { getMyHistory, type TournamentHistory } from "@/lib/player-history.functions";

function MatchList({ t }: { t: TournamentHistory }) {
  if (!t.matches.length) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <Trophy className="size-4" aria-hidden="true" /> No approved results yet.
      </div>
    );
  }
  return (
    <ol className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
      {t.matches.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
          <div className="min-w-0">
            <p className="font-semibold">vs {m.opponent}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3" aria-hidden="true" /> Week {m.week} · {m.date}
              {m.noShow ? " · No-show" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-xs font-bold ${m.result === "Won" ? "text-up" : m.result === "Lost" ? "text-down" : "text-muted-foreground"}`}>
              {m.result}
            </p>
            <p className="tabnum mt-0.5 text-sm font-semibold">{m.score}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TournamentCard({ t, open }: { t: TournamentHistory; open?: boolean }) {
  const stats: Array<[string, string | number]> = [
    ["Played", t.played],
    ["Won", t.wins],
    ["Lost", t.losses],
    ["Sets", `${t.setsWon}–${t.setsLost}`],
  ];
  return (
    <details open={open} className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="font-display text-lg font-bold">{t.seasonName}</p>
          <p className="text-sm text-muted-foreground">
            {t.teamName}
            {t.players.length ? ` · ${t.players.join(" & ")}` : ""}
          </p>
        </div>
        <div className="text-right text-sm">
          {t.finalDivision ? (
            <p className="font-semibold">
              Division {t.finalDivision}
              {t.finalRank ? ` · #${t.finalRank}` : ""}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">{t.isActive && !t.finished ? "In progress" : "Final"}</p>
        </div>
      </summary>
      <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
        {t.achievements.length ? (
          <div className="flex flex-wrap gap-2">
            {t.achievements.map((a) => (
              <span key={a} className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {a}
              </span>
            ))}
          </div>
        ) : null}
        <dl className="grid grid-cols-4 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-md border border-border px-2 py-3 text-center">
              <dd className="tabnum text-lg font-bold">{value}</dd>
              <dt className="text-xs text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
        {t.startDivision ? (
          <p className="text-xs text-muted-foreground">
            Started in Division {t.startDivision}
            {t.bestDivision ? ` · Best: Division ${t.bestDivision}` : ""}
          </p>
        ) : null}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold">
            <Swords className="size-4 text-primary" aria-hidden="true" /> All matches
          </h4>
          <MatchList t={t} />
        </div>
      </div>
    </details>
  );
}

export function PlayerHistory() {
  const fetchHistory = useServerFn(getMyHistory);
  const { data, isLoading, error } = useQuery({ queryKey: ["my-history"], queryFn: () => fetchHistory() });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading match history…</p>;
  if (error) return <p className="text-sm text-destructive">Could not load your match history.</p>;
  const current = (data ?? []).filter((t) => t.isActive && !t.finished);
  const past = (data ?? []).filter((t) => !(t.isActive && !t.finished));
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Swords className="size-5 text-primary" /> My match history
        </h2>
        {current.length ? (
          <div className="space-y-3">{current.map((t) => <TournamentCard key={t.seasonId} t={t} open />)}</div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No matches found for your account in the current tournament. Your history appears when your email matches a registered player.
          </p>
        )}
      </section>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <History className="size-5 text-primary" /> History
        </h2>
        {past.length ? (
          <div className="space-y-3">{past.map((t) => <TournamentCard key={t.seasonId} t={t} />)}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Finished tournaments will be kept here with your results and achievements.</p>
        )}
      </section>
    </div>
  );
}
