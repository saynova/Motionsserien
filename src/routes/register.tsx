import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { AccountRegistration } from "@/components/account-registration";
import { PageHeader } from "@/components/tournament-ui";
import { registeredTeamsQueryOptions, registrationInfoQueryOptions } from "@/lib/tournament-query";

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

const field = "w-full rounded border border-input bg-card px-3 py-2 text-sm font-medium";
const label = "mb-1 block text-xs uppercase tracking-widest text-muted-foreground";

function RegisterPage() {
  const info = useSuspenseQuery(registrationInfoQueryOptions).data;
  const teams = useSuspenseQuery(registeredTeamsQueryOptions).data;
  return (
    <>
      <PageHeader
        eyebrow={info.targetSeason ? `Registration · ${info.targetSeason}` : "Registration"}
        title="Team registration"
        description={
          info.requireSignIn === false
            ? "Register your team with both players, or sign in to manage it from your account. An admin reviews every entry. Emails and phone numbers are never shown publicly."
            : "Sign in, then register your team with both players, or ask us to find you a partner. An admin reviews every entry. Emails and phone numbers are never shown publicly."
        }

      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="space-y-4">
        {info.isOpen ? (
          <>
            <AccountRegistration />

            <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h2 className="font-display text-lg font-bold text-primary">Before You Register</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                The registration fee is <strong>800 kr per team</strong>, payable via Swish to{" "}
                <strong>123-111 21 43</strong>. <strong>Swish message should be Team Name.</strong>{" "}
                Please send your payment before the tournament. Team reservations are strictly
                first-come, first-served, so don't wait—secure your spot today!
              </p>

            </section>
          </>
        ) : (
          <div className="space-y-3 rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-bold uppercase tracking-wide">Registration is closed</h2>
            <p className="text-sm text-muted-foreground">
              Registration for the next season is not open right now. Check back before the season
              starts.
            </p>
          </div>
        )}
        </div>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
            <h2 className="text-lg font-bold uppercase tracking-wider text-primary">
              Registered teams
            </h2>
            <span className="tabnum text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {teams.length} approved
            </span>
          </div>
          {teams.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No approved teams yet. Approved teams show here with their division.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 text-left font-semibold">Team</th>
                  <th className="px-4 py-2 text-left font-semibold">Players</th>
                  <th className="px-4 py-2 text-right font-semibold">Division</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.team_name} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 font-semibold">{team.team_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {team.player1_name} & {team.player2_name}
                    </td>
                    <td className="tabnum px-4 py-2.5 text-right font-semibold">
                      {team.division ? `Div ${team.division}` : "To be set"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
