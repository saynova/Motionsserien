import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { DivisionBanner, PageHeader, ScoreText, StatusPill } from "@/components/tournament-ui";
import { courtForDivision, formatWeekDate, sessionForDivision } from "@/lib/tournament";
import { tournamentQueryOptions } from "@/lib/tournament-query";

type Search = { week?: number; court?: number; division?: number; team?: string };

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Weekly schedule & court planner — Motionsserien HT-26" },
      {
        name: "description",
        content:
          "Monday badminton schedule for Motionsserien HT-26: filter by week, court, division or team to find your match time.",
      },
      { property: "og:title", content: "Weekly schedule & court planner — Motionsserien HT-26" },
      {
        property: "og:description",
        content: "Find your Monday badminton match by week, court, division or team name.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    week: search.week ? Number(search.week) : undefined,
    court: search.court ? Number(search.court) : undefined,
    division: search.division ? Number(search.division) : undefined,
    team: typeof search.team === "string" ? search.team : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tournamentQueryOptions),
  component: SchedulePage,
});

function SchedulePage() {
  const { data } = useSuspenseQuery(tournamentQueryOptions);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { season, teams, matches } = data;

  const week = search.week ?? season.current_week;
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "Unknown";
  const query = (search.team ?? "").trim().toLowerCase();

  const weekMatches = matches
    .filter((m) => m.week_no === week)
    .filter((m) => (search.court ? m.court === search.court : true))
    .filter((m) => (search.division ? m.division === search.division : true))
    .filter((m) =>
      query
        ? teamName(m.team_a_id).toLowerCase().includes(query) ||
          teamName(m.team_b_id).toLowerCase().includes(query)
        : true,
    );

  const divisions = [...new Set(weekMatches.map((m) => m.division))].sort((a, b) => a - b);
  const availableWeeks = [...new Set(matches.map((m) => m.week_no))].sort((a, b) => a - b);

  const update = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const selectClass =
    "rounded border border-input bg-card px-3 py-2 text-sm font-medium text-foreground";

  return (
    <>
      <PageHeader
        eyebrow={`${season.name} · Play date ${formatWeekDate(season.start_monday, week)}`}
        title="Schedule & court planner"
        description="Divisions 1–5 play 19:00–20:00 on courts 1–5. Divisions 6–10 play 20:00–21:00 on courts 1–5. Three matches per division, 20 minutes apart."
      >
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Week</span>
            <select
              className={selectClass}
              value={week}
              onChange={(e) => update({ week: Number(e.target.value) })}
            >
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                  {w === season.current_week ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Court</span>
            <select
              className={selectClass}
              value={search.court ?? ""}
              onChange={(e) =>
                update({ court: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">All courts</option>
              {[1, 2, 3, 4, 5].map((c) => (
                <option key={c} value={c}>
                  Court {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Division
            </span>
            <select
              className={selectClass}
              value={search.division ?? ""}
              onChange={(e) =>
                update({ division: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">All divisions</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Division {d}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Team</span>
            <input
              className={selectClass}
              placeholder="Search team name"
              value={search.team ?? ""}
              onChange={(e) => update({ team: e.target.value || undefined })}
            />
          </label>
        </div>
      </PageHeader>

      {divisions.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No matches match those filters.
        </p>
      ) : (
        <div className="space-y-6">
          {divisions.map((division) => (
            <section
              key={division}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <DivisionBanner
                division={division}
                court={courtForDivision(division)}
                time={sessionForDivision(division)}
              />
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 text-left font-semibold">Start</th>
                    <th className="px-2 py-2 text-left font-semibold">Court</th>
                    <th className="px-2 py-2 text-left font-semibold">Team A</th>
                    <th className="px-2 py-2 text-left font-semibold">Team B</th>
                    <th className="px-2 py-2 text-left font-semibold">Score</th>
                    <th className="px-4 py-2 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {weekMatches
                    .filter((m) => m.division === division)
                    .sort((a, b) => a.match_no - b.match_no)
                    .map((match) => (
                      <tr key={match.id} className="border-b border-border/60 last:border-0">
                        <td className="tabnum px-4 py-3 font-semibold">{match.start_time}</td>
                        <td className="tabnum px-2 py-3 text-muted-foreground">{match.court}</td>
                        <td className="px-2 py-3 font-medium">{teamName(match.team_a_id)}</td>
                        <td className="px-2 py-3 font-medium">{teamName(match.team_b_id)}</td>
                        <td className="px-2 py-3">
                          <ScoreText match={match} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <StatusPill match={match} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
