import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChartNoAxesCombined, Minus, Trophy } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/tournament-ui";
import { TeamDetailsDialog } from "@/components/team-details-dialog";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { computeStandings } from "@/lib/tournament";
import { tournamentQueryOptions } from "@/lib/tournament-query";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Team progress across the season — Motionsserien HT-26" },
      {
        name: "description",
        content:
          "Week-by-week division and rank history for all 30 teams in the Motionsserien HT-26 badminton ladder.",
      },
      { property: "og:title", content: "Team progress — Motionsserien HT-26" },
      {
        property: "og:description",
        content: "Track how all 30 teams move up and down the divisions week by week.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tournamentQueryOptions),
  errorComponent: ({ error }) => <p role="alert">Could not load team progress: {error.message}</p>,
  notFoundComponent: () => <p>Team progress was not found.</p>,
  component: ProgressPage,
});

export function ProgressPage() {
  const { data } = useSuspenseQuery(tournamentQueryOptions);
  const { season, teams, slots, matches } = data;
  const [selectedTeamId, setSelectedTeamId] = useState(() =>
    [...teams].sort((a, b) => a.start_division - b.start_division || a.name.localeCompare(b.name))[0]?.id ?? "",
  );
  const [detailTeamId, setDetailTeamId] = useState<string | null>(null);

  const weeks = [...new Set(slots.map((s) => s.week_no))].sort((a, b) => a - b);

  // division + rank per team per week
  const cells = new Map<string, { division: number; rank: number | null }>();
  for (const week of weeks) {
    const weekSlots = slots.filter((s) => s.week_no === week);
    const weekMatches = matches.filter((m) => m.week_no === week);
    const hasResults = weekMatches.some((m) => m.status === "final");
    const standings = computeStandings(weekSlots, weekMatches, teams);
    for (const rows of standings.values()) {
      for (const row of rows) {
        cells.set(`${row.teamId}:${week}`, {
          division: row.division,
          rank: hasResults ? row.rank : null,
        });
      }
    }
  }

  const ordered = [...teams].sort((a, b) => {
    const first = weeks[0];
    const ca = first != null ? cells.get(`${a.id}:${first}`) : undefined;
    const cb = first != null ? cells.get(`${b.id}:${first}`) : undefined;
    return (ca?.division ?? 99) - (cb?.division ?? 99) || a.name.localeCompare(b.name);
  });
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? ordered[0];
  const history = selectedTeam
    ? weeks.map((week) => {
        const cell = cells.get(`${selectedTeam.id}:${week}`);
        const finalMatches = matches.filter(
          (match) =>
            match.week_no === week &&
            match.status === "final" &&
            (match.team_a_id === selectedTeam.id || match.team_b_id === selectedTeam.id),
        );
        const row = [...computeStandings(
          slots.filter((slot) => slot.week_no === week),
          matches.filter((match) => match.week_no === week),
          teams,
        ).values()].flat().find((item) => item.teamId === selectedTeam.id);
        return {
          week,
          position: cell ? cell.division + ((cell.rank ?? 2) - 1) * 0.2 : null,
          division: cell?.division ?? null,
          rank: cell?.rank ?? null,
          wins: row?.matchWins ?? 0,
          played: finalMatches.length,
        };
      })
    : [];
  const latest = [...history].reverse().find((item) => item.division != null);

  return (
    <>
      <PageHeader
        eyebrow={season.name}
        title="Team progress"
        description="Division and finishing rank for every team, week by week. An arrow shows a division change compared with the previous week."
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Select team"
            value={selectedTeam?.id ?? ""}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="h-10 min-w-52 cursor-pointer rounded-md border border-input bg-background px-3 text-sm font-semibold"
          >
            {ordered.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          {selectedTeam ? (
            <Button variant="outline" onClick={() => setDetailTeamId(selectedTeam.id)}>View team details</Button>
          ) : null}
        </div>
      </PageHeader>

      <section className="glass-surface mb-7 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/45 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Season trajectory</p>
            <h2 className="mt-1 text-xl font-bold">{selectedTeam?.name ?? "Team progress"}</h2>
          </div>
          {latest ? (
            <div className="flex items-center gap-2 rounded-md border border-primary/15 bg-background px-3 py-2 text-sm">
              <Trophy className="size-4 text-primary" aria-hidden="true" />
              <span className="font-semibold">Division {latest.division}{latest.rank ? ` · Rank #${latest.rank}` : ""}</span>
            </div>
          ) : null}
        </div>
        <div className="px-2 py-5 sm:px-5">
          <ChartContainer config={{ position: { label: "Position", color: "var(--color-primary)" } }} className="h-[20rem] w-full aspect-auto sm:h-[24rem]">
            <LineChart data={history} margin={{ top: 16, right: 20, bottom: 6, left: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickFormatter={(value) => `W${value}`} />
              <YAxis
                domain={[1, 10.4]}
                reversed
                width={38}
                tickLine={false}
                axisLine={false}
                ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                tickFormatter={(value) => `D${value}`}
              />
              <ReferenceLine y={5.5} stroke="var(--color-border)" strokeDasharray="5 5" />
              <ChartTooltip
                content={<ChartTooltipContent hideIndicator labelFormatter={(_, payload) => {
                  const point = payload[0]?.payload as (typeof history)[number] | undefined;
                  return point ? `Week ${point.week} · Division ${point.division}${point.rank ? ` · Rank #${point.rank}` : ""}` : "";
                }} formatter={(_, __, item) => {
                  const point = item.payload as (typeof history)[number];
                  return <span>{point.wins} wins from {point.played} matches</span>;
                }} />}
              />
              <Line
                type="monotone"
                dataKey="position"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ r: 5, fill: "var(--color-background)", strokeWidth: 3 }}
                activeDot={{ r: 7 }}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border sm:grid-cols-4">
          {history.slice(-4).map((item, index, recent) => {
            const previous = recent[index - 1];
            const change = previous?.division && item.division ? item.division - previous.division : 0;
            return (
              <div key={item.week} className="px-3 py-3 text-center">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Week {item.week}</p>
                <p className="mt-1 flex items-center justify-center gap-1 font-bold">
                  {change < 0 ? <ArrowUp className="size-3.5 text-up" /> : change > 0 ? <ArrowDown className="size-3.5 text-down" /> : <Minus className="size-3.5 text-hold" />}
                  {item.division ? `D${item.division}` : "—"}{item.rank ? ` · #${item.rank}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mb-3 flex items-center gap-2">
        <ChartNoAxesCombined className="size-4 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-bold">All teams by week</h2>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="sticky left-0 bg-card px-4 py-2 text-left font-semibold">Team</th>
              <th className="px-2 py-2 text-center font-semibold">Start</th>
              {weeks.map((w) => (
                <th key={w} className="px-2 py-2 text-center font-semibold">
                  W{w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((team) => (
              <tr key={team.id} className="border-b border-border/60 last:border-0">
                <td className="sticky left-0 bg-card px-4 py-2.5 font-semibold whitespace-nowrap">
                  <button type="button" onClick={() => setDetailTeamId(team.id)} className="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {team.name}
                  </button>
                </td>
                <td className="tabnum px-2 py-2.5 text-center text-muted-foreground">
                  {team.start_division}
                </td>
                {weeks.map((w, i) => {
                  const cell = cells.get(`${team.id}:${w}`);
                  const prevWeek = weeks[i - 1];
                  const prev = prevWeek != null ? cells.get(`${team.id}:${prevWeek}`) : undefined;
                  const moved =
                    cell && prev ? cell.division - prev.division : 0;
                  return (
                    <td key={w} className="px-2 py-2.5 text-center">
                      {cell ? (
                        <span className="inline-flex items-center gap-1">
                          {moved < 0 ? (
                            <ArrowUp className="size-3 text-up" aria-label="Moved up" />
                          ) : moved > 0 ? (
                            <ArrowDown className="size-3 text-down" aria-label="Moved down" />
                          ) : null}
                          <span className="tabnum font-semibold">D{cell.division}</span>
                          {cell.rank ? (
                            <span className="tabnum text-xs text-muted-foreground">
                              #{cell.rank}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        D = division for that week. # = finishing rank once results are approved.
      </p>
      <TeamDetailsDialog data={data} teamId={detailTeamId} onClose={() => setDetailTeamId(null)} />
    </>
  );
}
