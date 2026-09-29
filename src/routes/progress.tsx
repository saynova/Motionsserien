import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChartNoAxesCombined, Minus, Search, ShieldCheck, Trophy } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/tournament-ui";
import { TeamDetailsDialog } from "@/components/team-details-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          "Week-by-week division and rank history for all 30 teams in the Motionsserien HT-26 badminton ladder in Ludvika.",
      },
      {
        name: "keywords",
        content:
          "badminton division history, Motionsserien team rankings, badminton ladder stats, division movement, badminton statistik, team progress badminton Ludvika",
      },
      { property: "og:title", content: "Team progress — Motionsserien HT-26" },
      {
        property: "og:description",
        content: "Track how all 30 teams move up and down the divisions week by week.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.motionsserien.se/progress" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.motionsserien.se/progress" }],
  }),

  loader: ({ context }) => context.queryClient.ensureQueryData(tournamentQueryOptions),
  errorComponent: ({ error }) => <p role="alert">Could not load team progress: {error.message}</p>,
  notFoundComponent: () => <p>Team progress was not found.</p>,
  component: ProgressPage,
});

function ProgressPage() {
  const { data } = useSuspenseQuery(tournamentQueryOptions);
  const { season, teams, slots, matches } = data;
  const [selectedTeamId, setSelectedTeamId] = useState(() =>
    [...teams].sort((a, b) => a.start_division - b.start_division || a.name.localeCompare(b.name))[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
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

  const q = query.trim().toLowerCase();
  const filtered = q
    ? ordered.filter((t) => t.name.toLowerCase().includes(q))
    : ordered;
  const divTone = (d: number | null) =>
    d == null ? "bg-muted text-muted-foreground" : d <= 2 ? "bg-primary/12 text-primary ring-1 ring-primary/25" : d <= 5 ? "bg-secondary text-foreground ring-1 ring-border" : "bg-muted/70 text-muted-foreground ring-1 ring-border";

  return (
    <>
      <PageHeader
        eyebrow={season.name}
        title="Team progress"
        description="Division and finishing rank for every team, week by week."
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Official league tracker
          </span>
          <Select value={selectedTeam?.id ?? ""} onValueChange={setSelectedTeamId}>
            <SelectTrigger aria-label="Select team" className="h-10 min-w-56 rounded-full border-border bg-card/80 px-4 font-semibold shadow-sm transition-colors hover:border-primary/40 focus:ring-2 focus:ring-primary/30">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {ordered.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedTeam ? (
            <Button variant="outline" className="rounded-full" onClick={() => setDetailTeamId(selectedTeam.id)}>View team details</Button>
          ) : null}
        </div>
      </PageHeader>

      <section className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-30px_color-mix(in_oklab,var(--color-primary)_45%,transparent)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Season trajectory</p>
            <h2 className="mt-1 truncate text-2xl font-bold">{selectedTeam?.name ?? "Team progress"}</h2>
          </div>
          {latest ? (
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-sm backdrop-blur">
              <Trophy className="size-4 text-primary" aria-hidden="true" />
              <span className="font-semibold">Division {latest.division}{latest.rank ? ` · Rank #${latest.rank}` : ""}</span>
            </div>
          ) : null}
        </div>
        <div className="relative px-2 py-5 sm:px-5">
          <ChartContainer config={{ position: { label: "Position", color: "var(--color-primary)" } }} className="h-[18rem] w-full aspect-auto sm:h-[22rem]">
            <AreaChart data={history} margin={{ top: 16, right: 20, bottom: 6, left: 4 }}>
              <defs>
                <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickFormatter={(value) => `W${value}`} />
              <YAxis domain={[1, 10.4]} reversed width={38} tickLine={false} axisLine={false} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} tickFormatter={(value) => `D${value}`} />
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
              <Area type="monotone" dataKey="position" stroke="var(--color-primary)" strokeWidth={3} fill="url(#progressFill)" baseValue={10.4}
                dot={{ r: 5, fill: "var(--color-background)", stroke: "var(--color-primary)", strokeWidth: 3 }} activeDot={{ r: 7 }} connectNulls />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="relative border-t border-border bg-secondary/30 px-4 py-5 sm:px-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Week by week</p>
          <ol className="flex gap-0 overflow-x-auto pb-1">
            {history.map((item, index) => {
              const previous = history[index - 1];
              const change = previous?.division && item.division ? item.division - previous.division : 0;
              const Icon = change < 0 ? ArrowUp : change > 0 ? ArrowDown : Minus;
              const tone = change < 0 ? "border-up bg-up text-background" : change > 0 ? "border-down bg-down text-background" : "border-primary/40 bg-card text-primary";
              return (
                <li key={item.week} className="relative flex min-w-24 flex-1 flex-col items-center text-center">
                  {index > 0 ? <span aria-hidden="true" className="absolute right-1/2 top-4 h-0.5 w-full bg-gradient-to-r from-border to-primary/40" /> : null}
                  <span className={`relative z-10 grid size-8 place-items-center rounded-full border-2 ${tone} transition-transform hover:scale-110`}>
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <p className="mt-2 text-[11px] font-semibold uppercase text-muted-foreground">Week {item.week}</p>
                  <span className={`tabnum mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${divTone(item.division)}`}>
                    {item.division ? `D${item.division}` : "—"}{item.rank ? ` · #${item.rank}` : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div className="mb-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-2">
          <ChartNoAxesCombined className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <h2 className="truncate text-lg font-bold">All teams by week</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{filtered.length}</span>
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teams…" aria-label="Search teams" className="h-10 rounded-full bg-card pl-9" />
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="sticky left-0 z-10 bg-secondary px-4 py-3 text-left font-semibold shadow-[1px_0_0_var(--color-border)]">Team</th>
                <th className="px-2 py-3 text-center font-semibold">Start</th>
                {weeks.map((w) => <th key={w} className="px-2 py-3 text-center font-semibold">W{w}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={weeks.length + 2} className="px-4 py-10 text-center text-muted-foreground">No teams match “{query}”.</td></tr>
              ) : filtered.map((team) => (
                <tr key={team.id} className={`group border-b border-border/60 transition-colors last:border-0 hover:bg-primary/5 ${team.id === selectedTeam?.id ? "bg-primary/5" : ""}`}>
                  <td className="sticky left-0 z-10 max-w-56 bg-card px-4 py-2.5 font-semibold shadow-[1px_0_0_var(--color-border)] group-hover:bg-secondary">
                    <button type="button" onClick={() => setDetailTeamId(team.id)} className="block max-w-full truncate text-left text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {team.name}
                    </button>
                  </td>
                  <td className="tabnum px-2 py-2.5 text-center text-muted-foreground">{team.start_division}</td>
                  {weeks.map((w, i) => {
                    const cell = cells.get(`${team.id}:${w}`);
                    const prevWeek = weeks[i - 1];
                    const prev = prevWeek != null ? cells.get(`${team.id}:${prevWeek}`) : undefined;
                    const moved = cell && prev ? cell.division - prev.division : 0;
                    const tone = moved < 0 ? "bg-up/12 text-up ring-up/30" : moved > 0 ? "bg-down/12 text-down ring-down/30" : "bg-muted text-foreground ring-border";
                    return (
                      <td key={w} className="px-2 py-2 text-center">
                        {cell ? (
                          <span className={`tabnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${tone}`}>
                            {moved < 0 ? <ArrowUp className="size-3" aria-label="Moved up" /> : moved > 0 ? <ArrowDown className="size-3" aria-label="Moved down" /> : null}
                            D{cell.division}
                            {cell.rank ? <span className="opacity-70">#{cell.rank}</span> : null}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden" />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        D = division for that week. # = finishing rank once results are approved. Green = moved up, red = moved down. Scroll sideways on small screens.
      </p>
      <TeamDetailsDialog data={data} teamId={detailTeamId} onClose={() => setDetailTeamId(null)} />
    </>
  );
}
