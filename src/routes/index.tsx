import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { MovementBadge, PageHeader, ScoreText, StatusPill } from "@/components/tournament-ui";
import {
  computeStandings,
  courtForDivision,
  formatWeekDate,
  sessionForDivision,
} from "@/lib/tournament";
import { tournamentQueryOptions } from "@/lib/tournament-query";

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
  loader: ({ context }) => context.queryClient.ensureQueryData(tournamentQueryOptions),
  component: StandingsPage,
});

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
      <PageHeader
        eyebrow={`${season.name} · Week ${week} of ${season.total_weeks}`}
        title="Current standings"
        description="Rank 1 moves up a division, rank 2 stays, rank 3 moves down. Division 1 winners and Division 10 bottom teams hold their place. Only approved scores count."
      >
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Play date</dt>
            <dd className="tabnum font-semibold">{formatWeekDate(season.start_monday, week)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">
              Results counted
            </dt>
            <dd className="tabnum font-semibold">
              {finalCount} of {weekMatches.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">
              Awaiting approval
            </dt>
            <dd className="tabnum font-semibold">{pendingCount}</dd>
          </div>
          <div className="self-end">
            <Link
              to="/submit"
              className="inline-flex rounded bg-primary px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
            >
              Submit a score
            </Link>
          </div>
        </dl>
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
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
                <h2 className="text-xl font-bold uppercase tracking-wider text-primary">
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
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs"
                    >
                      <span className="tabnum text-muted-foreground">{match.start_time}</span>
                      <span className="flex-1 font-medium">
                        {teamName(match.team_a_id)} <span className="text-muted-foreground">v</span>{" "}
                        {teamName(match.team_b_id)}
                      </span>
                      <ScoreText match={match} teamName={teamName} />
                      <StatusPill match={match} />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
