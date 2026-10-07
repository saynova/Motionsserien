import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, ChevronDown, Lock, ShieldCheck, Smartphone, Trophy, Users } from "lucide-react";

import { AccountRegistration } from "@/components/account-registration";
import { RulesToPlay } from "@/components/rules-to-play";
import { useEffect, useState } from "react";
import { registeredTeamsQueryOptions, registrationInfoQueryOptions } from "@/lib/tournament-query";

const TOTAL_SPOTS = 30;

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Team registration — Motionsserien badminton" },
      {
        name: "description",
        content:
          "Register your team for the next Motionsserien badminton season in Ludvika: team name, both players and your previous division. Accepted teams appear in the public list.",
      },
      {
        name: "keywords",
        content:
          "badminton registration Ludvika, join badminton tournament, badminton anmälan, motionsserie anmälan, team sign up badminton, badminton Dalarna registration, Hitachi IF badminton",
      },
      { property: "og:title", content: "Team registration — Motionsserien badminton" },
      {
        property: "og:description",
        content: "Sign your team up for the next season and see the accepted teams and divisions.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.motionsserien.se/register" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.motionsserien.se/register" }],
  }),

  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(registrationInfoQueryOptions),
      context.queryClient.ensureQueryData(registeredTeamsQueryOptions),
    ]),
  component: RegisterPage,
});

function RegisterPage() {
  const info = useSuspenseQuery(registrationInfoQueryOptions).data;
  const teams = useSuspenseQuery(registeredTeamsQueryOptions).data;
  const filled = Math.min(teams.length, TOTAL_SPOTS);
  const pct = Math.round((filled / TOTAL_SPOTS) * 100);
  const left = TOTAL_SPOTS - filled;
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-accent/15 p-6 shadow-sm sm:p-10">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-12 left-1/3 size-48 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              <Trophy className="size-3.5" aria-hidden="true" />
              {info.targetSeason ? `Registration · ${info.targetSeason}` : "Registration"}
            </span>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Team <span className="text-primary">registration</span>
            </h1>
            <SimpleCountdown startsAt={info.tournamentStartsAt} />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {info.requireSignIn === false
                ? "Register your team with both players, or sign in to manage it from your account. An admin reviews every entry."
                : "Sign in, then register your team with both players, or ask us to find you a partner. An admin reviews every entry."}
            </p>
          </div>

          {/* Spots progress */}
          <div className="rounded-xl border border-border bg-card/90 p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Spots filled</span>
              <span className="tabnum font-display text-2xl font-bold">
                {filled}
                <span className="text-base text-muted-foreground"> / {TOTAL_SPOTS}</span>
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={TOTAL_SPOTS}>
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {left > 0 ? `${left} spots left · first come, first served` : "All spots filled — new teams join the waitlist"}
            </p>
            {info.isOpen && (
              <button
                type="button"
                onClick={() => setShowRules((v) => !v)}
                aria-expanded={showRules}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
              >
                <BookOpen className="size-4" aria-hidden="true" />
                {showRules ? "Hide rules to play" : "View rules to play"}
                <ChevronDown className={`size-4 transition-transform ${showRules ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>

      {info.isOpen && showRules && <RulesToPlay />}



      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <div className="space-y-4">
          {info.isOpen ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                <Lock className="size-4 shrink-0 text-primary" aria-hidden="true" />
                Your email and phone are private — never shown publicly.
              </div>

              <AccountRegistration />

              {/* Swish callout */}
              <section className="rounded-xl border border-accent/40 border-l-4 border-l-accent bg-accent/10 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Smartphone className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold">Pay with Swish</h2>
                    <p className="text-xs text-muted-foreground">Before the tournament starts</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-card p-3">
                    <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Fee</dt>
                    <dd className="font-display text-xl font-bold">800 kr</dd>
                    <dd className="text-xs text-muted-foreground">per team</dd>
                  </div>
                  <div className="rounded-lg bg-card p-3">
                    <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Swish number</dt>
                    <dd className="tabnum font-display text-xl font-bold">123-111 21 43</dd>
                  </div>
                </dl>
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-card p-3 text-sm">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>
                    Write your <strong>Team Name</strong> as the Swish message. Spots are strictly first come, first
                    served — secure yours today!
                  </span>
                </p>
              </section>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-2 font-display text-xl font-bold">Registration is closed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Registration for the next season is not open right now. Check back before the season starts.
              </p>
            </div>
          )}
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <h2 className="font-display text-lg font-bold">Registered teams</h2>
            <span className="rounded-full bg-up/10 px-2.5 py-0.5 text-xs font-bold text-up">
              {teams.length} approved
            </span>
          </div>
          {teams.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="size-8 text-primary" aria-hidden="true" />
              </span>
              <p className="mt-4 font-display text-lg font-bold">Be the first team on the list</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Approved teams appear here with their players and division.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 p-4 sm:grid-cols-2">
              {teams.map((team, i) => (
                <li
                  key={team.team_name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <span className="tabnum flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{team.team_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {team.player1_name} & {team.player2_name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-bold">
                    {team.division ? `Div ${team.division}` : "TBD"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SimpleCountdown({ startsAt }: { startsAt: string | null | undefined }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!startsAt || now === null) return null;
  const ms = new Date(startsAt).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return null;
  const parts: [number, string][] = [
    [Math.floor(ms / 86_400_000), "days"],
    [Math.floor((ms % 86_400_000) / 3_600_000), "hrs"],
    [Math.floor((ms % 3_600_000) / 60_000), "min"],
    [Math.floor((ms % 60_000) / 1000), "sec"],
  ];
  return (
    <div className="mt-4 flex gap-2" aria-label="Time until the tournament starts">
      {parts.map(([n, l]) => (
        <div key={l} className="min-w-14 rounded-lg border border-border bg-card px-2 py-1.5 text-center">
          <div className="tabnum font-display text-xl font-bold">{n}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
}
