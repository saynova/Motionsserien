import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarRange, Layers3, ScrollText, Send, Trophy, Users, X } from "lucide-react";


import { MovementBadge, PageHeader, ScoreText, StatusPill } from "@/components/tournament-ui";
import { Button } from "@/components/ui/button";
import {
  computeStandings,
  courtForDivision,
  formatWeekDate,
  sessionForDivision,
} from "@/lib/tournament";
import { memoriesQueryOptions, tournamentQueryOptions } from "@/lib/tournament-query";
import { MemoriesView } from "@/components/memories-view";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Standings — Motionsserien HT-26 Badminton Ladder" },
      {
        name: "description",
        content:
          "Live division standings for the Motionsserien HT-26 badminton ladder, with promotion and relegation for all 10 divisions.",
      },
      { property: "og:title", content: "Standings — Motionsserien HT-26" },
      {
        property: "og:description",
        content:
          "Live division standings with promotion and relegation across all 10 divisions of the Monday badminton ladder.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(tournamentQueryOptions),
      context.queryClient.ensureQueryData(memoriesQueryOptions),
    ]),
  component: HomePage,
});

function TermsNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem("terms-notice-dismissed") !== "yes") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
      <ScrollText className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1">
        Please read the{" "}
        <Link to="/terms" className="font-semibold text-primary underline">
          Terms &amp; Conditions
        </Link>{" "}
        before using this site.
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          window.localStorage.setItem("terms-notice-dismissed", "yes");
          setVisible(false);
        }}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function HomePage() {
  const memories = useSuspenseQuery(memoriesQueryOptions);
  if (memories.data.seasonFinished) {
    return (
      <>
        <PageHeader
          eyebrow="Memories"
          title="Champions & Gallery"
          description="Our Hall of Fame and the best moments from Monday nights in the Rackethall."
        />
        <div className="mt-8">
          <MemoriesView />
        </div>
      </>
    );
  }
  return <StandingsPage />;
}

function stockholmNow(): string {
  // "YYYY-MM-DD HH:mm" in Swedish time
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
}

function MissingScores({
  season, week, matches, teams,
}: {
  season: { start_monday: string };
  week: number;
  matches: { id: string; status: string; division: number; team_a_id: string; team_b_id: string }[];
  teams: { id: string; name: string }[];
}) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    setNow(stockholmNow());
    const t = setInterval(() => setNow(stockholmNow()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;

  const [y, m, d] = season.start_monday.split("-").map(Number);
  const tue = new Date(Date.UTC(y, m - 1, d + (week - 1) * 7 + 1));
  const showFrom = `${tue.toISOString().slice(0, 10)} 10:00`;
  if (now < showFrom) return null;

  const missing = matches.filter((x) => x.status === "scheduled");
  if (missing.length === 0) return null;
  const name = new Map(teams.map((t) => [t.id, t.name]));
  const teamNames = [...new Set(missing.flatMap((x) => [x.team_a_id, x.team_b_id]))]
    .map((id) => name.get(id) ?? "Unknown team")
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="mt-5 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
      <p className="text-sm font-semibold text-destructive">
        Missing scores · {missing.length} {missing.length === 1 ? "match" : "matches"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        These teams have not submitted their result yet:
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {teamNames.map((n) => (
          <li key={n} className="rounded-full border border-destructive/30 bg-card px-3 py-1 text-xs font-semibold">
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StandingsPage() {
  const { data } = useSuspenseQuery(tournamentQueryOptions);
  const { season, teams, slots, matches } = data;
  const week = season.current_week;

  const weekSlots = slots.filter((s) => s.week_no === week);
  const weekMatches = matches.filter((m) => m.week_no === week);
  const standings = computeStandings(weekSlots, weekMatches, teams);
  const divisions = [...standings.keys()].sort((a, b) => a - b);

  const finalCount = weekMatches.filter((m) => m.status === "final").length;
  const pendingCount = weekMatches.filter((m) => m.status === "pending").length;

  return (
    <>
      <section className="submit-score-hero relative mb-8 w-full overflow-hidden rounded-lg border border-primary/10 bg-card px-4 py-6 shadow-xl shadow-primary/5 sm:px-8 sm:py-10 lg:px-10">
        <div className="absolute inset-0 -translate-x-full animate-submit-shimmer bg-gradient-to-r from-transparent via-primary/5 to-transparent" aria-hidden="true" />
        <div className="relative flex items-start gap-4 sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-14">
            <Trophy className="size-6 sm:size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Week {week} scores
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Report the result for admin approval.</p>
            <Button
              size="default"
              className="mt-4 h-10 gap-2 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)] transition-all duration-200 ease-in-out hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(79,70,229,0.35)] active:translate-y-px"
              asChild
            >
              <Link to="/submit">
                <Send className="size-4" aria-hidden="true" />
                Submit Your Score
              </Link>
            </Button>
            <MissingScores season={season} week={week} matches={weekMatches} teams={teams} />


          </div>
        </div>

        <dl className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass-surface flex items-center gap-3 rounded-lg border border-border px-4 py-3">
            <Users className="size-5 text-primary" aria-hidden="true" />
            <div><dd className="tabnum text-lg font-bold">{teams.length}</dd><dt className="text-xs text-muted-foreground">Active teams</dt></div>
          </div>
          <div className="glass-surface flex items-center gap-3 rounded-lg border border-border px-4 py-3">
            <CalendarRange className="size-5 text-primary" aria-hidden="true" />
            <div><dd className="tabnum text-lg font-bold">{week} / {season.total_weeks}</dd><dt className="text-xs text-muted-foreground">Current round</dt></div>
          </div>
          <div className="glass-surface flex items-center gap-3 rounded-lg border border-border px-4 py-3">
            <Layers3 className="size-5 text-primary" aria-hidden="true" />
            <div><dd className="tabnum text-lg font-bold">{divisions.length}</dd><dt className="text-xs text-muted-foreground">Divisions</dt></div>
          </div>
        </dl>
      </section>

      <PageHeader
        eyebrow={`Play date · ${formatWeekDate(season.start_monday, week)}`}
        title="Current standings"
        description="Rank 1 moves up, rank 2 stays, and rank 3 moves down. Only approved scores count."
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-border bg-secondary px-3 py-1.5 font-semibold">{finalCount} of {weekMatches.length} results counted</span>
          <span className="rounded-full border border-border bg-secondary px-3 py-1.5 font-semibold">{pendingCount} awaiting approval</span>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {divisions.map((division) => {
          const rows = standings.get(division) ?? [];
          const divisionMatches = weekMatches
            .filter((m) => m.division === division)
            .sort((a, b) => a.match_no - b.match_no);
          return (
            <section
              key={division}
              className="glass-surface overflow-hidden rounded-lg border border-border bg-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
                <h2 className="text-xl font-bold text-primary">
                  Division {division}
                </h2>
                <span className="tabnum text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {sessionForDivision(division)} · Court {courtForDivision(division)}
                </span>
              </div>

              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-7 sm:w-9" />
                  <col />
                  <col className="w-7 sm:w-9" />
                  <col className="w-11 sm:w-14" />
                  <col className="hidden w-10 sm:table-column" />
                  <col className="hidden w-10 sm:table-column" />
                  <col className="hidden w-10 sm:table-column" />
                  <col className="w-[7.25rem] sm:w-[8.5rem]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 text-left font-semibold sm:px-3">#</th>
                    <th className="px-1 py-2 text-left font-semibold">Team</th>
                    <th className="px-1 py-2 text-right font-semibold sm:px-2" title="Match wins">
                      W
                    </th>
                    <th className="px-1 py-2 text-right font-semibold sm:px-2" title="Sets won / lost">
                      Sets
                    </th>
                    <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell" title="Set difference">
                      ±S
                    </th>
                    <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell" title="Points for">
                      Pts
                    </th>
                    <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell" title="Point difference">
                      ±P
                    </th>
                    <th className="px-2 py-2 text-right font-semibold sm:px-3">Next</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.teamId} className="border-b border-border/60 last:border-0">
                      <td className="tabnum px-2 py-2.5 font-bold text-muted-foreground sm:px-3">
                        {row.rank}
                      </td>
                      <td className="min-w-0 px-1 py-2.5 font-semibold">
                        <span className="block truncate" title={row.teamName}>{row.teamName}</span>
                      </td>
                      <td className="tabnum px-1 py-2.5 text-right sm:px-2">{row.matchWins}</td>
                      <td className="tabnum px-1 py-2.5 text-right text-muted-foreground sm:px-2">
                        {row.setsWon}–{row.setsLost}
                      </td>
                      <td className="tabnum hidden px-2 py-2.5 text-right sm:table-cell">
                        {row.setDiff > 0 ? `+${row.setDiff}` : row.setDiff}
                      </td>
                      <td className="tabnum hidden px-2 py-2.5 text-right text-muted-foreground sm:table-cell">
                        {row.pointsFor}
                      </td>
                      <td className="tabnum hidden px-2 py-2.5 text-right sm:table-cell">
                        {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
                      </td>
                      <td className="px-2 py-2.5 text-right sm:px-3">
                        <MovementBadge movement={row.movement} nextDivision={row.nextDivision} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-border/60 border-t border-border bg-background/30">
                {divisionMatches.map((match) => {
                  const teamName = (id: string) =>
                    teams.find((t) => t.id === id)?.name ?? "Unknown";
                  return (
                    <li
                      key={match.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-3 py-2 text-xs sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-4"
                    >
                      <span className="tabnum text-muted-foreground">{match.start_time}</span>
                      <span className="min-w-0 break-words font-medium">
                        {teamName(match.team_a_id)} <span className="text-muted-foreground">v</span>{" "}
                        {teamName(match.team_b_id)}
                      </span>
                      <span className="col-span-2 min-w-0 sm:col-span-1"><ScoreText match={match} teamName={teamName} /></span>
                      <span className="col-span-2 justify-self-start sm:col-span-1 sm:justify-self-end"><StatusPill match={match} /></span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <TermsNotice />
    </>
  );
}
