import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp } from "lucide-react";

import { PageHeader } from "@/components/tournament-ui";
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
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tournamentQueryOptions),
  component: ProgressPage,
});

export function ProgressPage() {
  const { data } = useSuspenseQuery(tournamentQueryOptions);
  const { season, teams, slots, matches } = data;

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

  return (
    <>
      <PageHeader
        eyebrow={season.name}
        title="Team progress"
        description="Division and finishing rank for every team, week by week. An arrow shows a division change compared with the previous week."
      />

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
                  {team.name}
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
    </>
  );
}
