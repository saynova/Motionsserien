import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarRange, Crown, Layers3, Lock, ScrollText, Send, Trophy, Users, X } from "lucide-react";


import { MovementBadge, PageHeader, ScoreText, StatusPill, WeeklyBanner } from "@/components/tournament-ui";
import { Button } from "@/components/ui/button";
import {
  computeStandings,
  courtForDivision,
  formatWeekDate,
  sessionForDivision,
} from "@/lib/tournament";
import { memoriesQueryOptions, tournamentQueryOptions } from "@/lib/tournament-query";
import { MemoriesView } from "@/components/memories-view";
import { TeamDetailsDialog } from "@/components/team-details-dialog";
import { brandingQueryOptions, DEFAULT_BRANDING } from "@/lib/branding.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Motionsserien Badminton tournament- Organized by Hitachi IF and Ludvika Badminton Club",
      },
      {
        name: "description",
        content:
          "Live division standings for the Motionsserien HT-26 badminton tournament, featuring promotion and relegation across all 10 divisions, organized by Hitachi IF and Ludvika Badminton Club. For inquiries, contact the General: Md Rabiul Islam",
      },
      {
        name: "keywords",
        content:
          "Motionsserien standings, Motionsserien HT-26, badminton Ludvika, Hitachi IF badminton, Ludvika Badmintonklubb, badminton division standings, badmintonstege, motionsserie badminton, badminton resultat, Rackethallen Ludvika, badminton Dalarna, promotion and relegation badminton",
      },
      {
        property: "og:title",
        content:
          "Motionsserien Badminton tournament- Organized by Hitachi IF and Ludvika Badminton Club",
      },
      {
        property: "og:description",
        content:
          "Live division standings for the Motionsserien HT-26 badminton tournament, featuring promotion and relegation across all 10 divisions, organized by Hitachi IF and Ludvika Badminton Club.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.motionsserien.se/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.motionsserien.se/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: "Motionsserien HT-26 Badminton Ladder",
          sport: "Badminton",
          url: "https://www.motionsserien.se/",
          description:
            "Weekly Monday badminton ladder with 30 teams across 10 divisions, with promotion and relegation each week.",
          startDate: "2026-09-07T19:00:00+02:00",
          endDate: "2026-11-09T22:00:00+01:00",
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          eventSchedule: {
            "@type": "Schedule",
            byDay: "https://schema.org/Monday",
            repeatFrequency: "P1W",
          },
          location: {
            "@type": "Place",
            name: "Rackethallen Ludvika",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Ludvika",
              addressRegion: "Dalarna",
              addressCountry: "SE",
            },
          },
          organizer: [
            { "@type": "SportsOrganization", name: "Hitachi IF" },
            { "@type": "SportsOrganization", name: "Ludvika Badminton Club" },
          ],
        }),
      },
    ],
  }),

  loader: async ({ context }) => {
    const [, memories] = await Promise.all([
      context.queryClient.ensureQueryData(tournamentQueryOptions),
      context.queryClient.ensureQueryData(memoriesQueryOptions),
    ]);
    if (memories.homepage === "schedule") throw redirect({ to: "/schedule", search: { week: undefined, court: undefined, division: undefined, team: undefined } });
    if (memories.homepage === "register") throw redirect({ to: "/register" });
    if (memories.homepage === "one-day") throw redirect({ to: "/one-day" });
  },
  errorComponent: ({ error }) => <p role="alert">Could not load the standings: {error instanceof Error ? error.message : String(error)}</p>,
  notFoundComponent: () => <p>Standings were not found.</p>,
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
        <WeeklyBanner />
        <div className="mt-8">

          <MemoriesView />
        </div>
      </>
    );
  }
  return (
    <>
      <WeeklyBanner />
      <StandingsPage />
    </>
  );
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
  const branding = useQuery(brandingQueryOptions());
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    setNow(stockholmNow());
    const t = setInterval(() => setNow(stockholmNow()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  if ((branding.data ?? DEFAULT_BRANDING).showMissingBanner === false) return null;

  const [y = 0, m = 1, d = 1] = season.start_monday.split("-").map(Number);
  const tue = new Date(Date.UTC(y, m - 1, d + (week - 1) * 7 + 1));
  const showFrom = `${tue.toISOString().slice(0, 10)} 10:00`;
  const thu = new Date(tue.getTime() + 2 * 24 * 60 * 60 * 1000);
  const showUntil = `${thu.toISOString().slice(0, 10)} 10:00`;
  if (now < showFrom || now >= showUntil) return null;

  const missing = matches.filter((x) => x.status === "scheduled");
  if (missing.length === 0) return null;
  const name = new Map(teams.map((t) => [t.id, t.name]));

  return (
    <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
      <p className="text-sm font-semibold text-destructive">
        Missing scores · {missing.length} {missing.length === 1 ? "match" : "matches"}
      </p>
      <ul className="mt-2 space-y-1.5">
        {missing.map((x) => (
          <li key={x.id} className="text-xs font-semibold">
            <span className="text-muted-foreground">Div {x.division}:</span>{" "}
            {name.get(x.team_a_id) ?? "Unknown"} vs {name.get(x.team_b_id) ?? "Unknown"}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StandingsPage() {
  const { data } = useSuspenseQuery(tournamentQueryOptions);
  const { season, teams, slots, matches } = data;
  const currentWeek = season.current_week;
  const [week, setWeek] = useState(currentWeek);
  const [detailTeamId, setDetailTeamId] = useState<string | null>(null);

  const availableWeeks = [...new Set(slots.map((s) => s.week_no))]
    .filter((w) => w <= currentWeek)
    .sort((a, b) => a - b);

  const weekSlots = slots.filter((s) => s.week_no === week);
  const weekMatches = matches.filter((m) => m.week_no === week);
  const standings = computeStandings(weekSlots, weekMatches, teams);
  const divisions = [...standings.keys()].sort((a, b) => a - b);

  const finalCount = weekMatches.filter((m) => m.status === "final").length;
  const pendingCount = weekMatches.filter((m) => m.status === "pending").length;

  return (
    <div className="standings-ambient">
      <section className="submit-score-hero standings-card relative mb-8 w-full overflow-hidden px-4 py-6 sm:px-8 sm:py-10 lg:px-10">
        <div className="absolute inset-0 -translate-x-full animate-submit-shimmer bg-gradient-to-r from-transparent via-primary/5 to-transparent" aria-hidden="true" />
        <div className="relative flex items-start gap-4 sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-14">
            <Trophy className="size-6 sm:size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Week {currentWeek} scores
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Report the result for admin approval.</p>
            <div className="mt-4 flex flex-wrap items-start gap-4">
              {season.score_submission_enabled === false ? (
                <span className="inline-flex h-10 shrink-0 cursor-not-allowed items-center gap-2 rounded-md bg-gradient-to-r from-[#6366f1] to-[#4f46e5] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)]">
                  <Lock className="size-4" aria-hidden="true" />
                  It's Locked!
                </span>
              ) : (
              <Button
                size="default"
                className="h-10 shrink-0 gap-2 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)] transition-all duration-200 ease-in-out hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(79,70,229,0.35)] active:translate-y-px"
                asChild
              >
                <Link to="/submit">
                  <Send className="size-4" aria-hidden="true" />
                  Submit Your Score
                </Link>
              </Button>
              )}
              <div className="min-w-0 flex-1 sm:max-w-md">
                <MissingScores season={season} week={currentWeek} matches={matches.filter((m) => m.week_no === currentWeek)} teams={teams} />
              </div>
            </div>
          </div>
        </div>

        <dl className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="standings-pill flex items-center gap-3 px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5">
            <Users className="size-5 text-primary" aria-hidden="true" />
            <div><dd className="tabnum text-lg font-bold">{teams.length}</dd><dt className="text-xs text-muted-foreground">Active teams</dt></div>
          </div>
          <div className="standings-pill flex items-center gap-3 px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5">
            <CalendarRange className="size-5 text-primary" aria-hidden="true" />
            <div><dd className="tabnum text-lg font-bold">{currentWeek} / {season.total_weeks}</dd><dt className="text-xs text-muted-foreground">Current round</dt></div>
          </div>
          <div className="standings-pill flex items-center gap-3 px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5">
            <Layers3 className="size-5 text-primary" aria-hidden="true" />
            <div><dd className="tabnum text-lg font-bold">{divisions.length}</dd><dt className="text-xs text-muted-foreground">Divisions</dt></div>
          </div>
        </dl>
      </section>

      <PageHeader
        eyebrow={`Play date · ${formatWeekDate(season.start_monday, week)}`}
        title={week === currentWeek ? "Current standings" : `Week ${week} standings`}
        description="Rank 1 moves up, rank 2 stays, and rank 3 moves down. Only approved scores count."
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              aria-label="Select week"
              className="standings-pill cursor-pointer px-3 py-1.5 font-semibold text-foreground transition-all duration-200 hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  Week {w}{w === currentWeek ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
          <span className="standings-pill px-3 py-1.5 font-semibold">{finalCount} of {weekMatches.length} results counted</span>
          <span className="standings-pill px-3 py-1.5 font-semibold">{pendingCount} awaiting approval</span>
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
              className="standings-card overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="standings-div-header flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
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
                        {division === 1 && row.rank === 1 ? (
                          <span className="champion-crown inline-flex size-5 items-center justify-center" title="Champion!">
                            <span className="champion-flower-left pointer-events-none absolute -left-0.5 -top-1 text-[7px] leading-none text-champion-flower" aria-hidden="true">✿</span>
                            <Crown className="size-5 fill-champion-gold-light/40 stroke-champion-gold-dark" strokeWidth={2.25} aria-hidden="true" />
                            <span className="champion-flower-right pointer-events-none absolute -right-0.5 -top-0.5 text-[6px] leading-none text-champion-flower" aria-hidden="true">✿</span>
                            <span className="sr-only">Champion!</span>
                          </span>
                        ) : row.rank}
                      </td>
                      <td className="min-w-0 px-1 py-2.5 font-semibold">
                        <button
                          type="button"
                          onClick={() => setDetailTeamId(row.teamId)}
                          className="block max-w-full truncate text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title={`View ${row.teamName} details`}
                        >
                          {row.teamName}
                        </button>
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
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-3 py-2 text-xs transition-colors duration-150 hover:bg-primary/5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-4"
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
      <TeamDetailsDialog data={data} teamId={detailTeamId} onClose={() => setDetailTeamId(null)} />
      <TermsNotice />
    </div>
  );
}
