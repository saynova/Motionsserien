import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/tournament-ui";
import { DIVISION_COUNT } from "@/lib/tournament";
import { registeredTeamsQueryOptions, registrationInfoQueryOptions } from "@/lib/tournament-query";
import { submitRegistration } from "@/lib/registration.functions";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Team registration — Motionsserien badminton" },
      {
        name: "description",
        content:
          "Register your team for the next Motionsserien badminton season: team name, both players and your previous division. Accepted teams appear in the public list.",
      },
      { property: "og:title", content: "Team registration — Motionsserien badminton" },
      {
        property: "og:description",
        content: "Sign your team up for the next season and see the accepted teams and divisions.",
      },
    ],
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
  const queryClient = useQueryClient();
  const send = useServerFn(submitRegistration);

  const [form, setForm] = useState({
    teamName: "",
    player1Name: "",
    player1Email: "",
    player2Name: "",
    player2Email: "",
    phone: "",
    previousDivision: "new",
  });
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await send({ data: { ...form } });
      toast.success("Registration sent. Your team appears in the list once it is approved.");
      setForm({
        teamName: "",
        player1Name: "",
        player1Email: "",
        player2Name: "",
        player2Email: "",
        phone: "",
        previousDivision: "new",
      });
      await queryClient.invalidateQueries({ queryKey: ["registered-teams"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the registration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={info.targetSeason ? `Registration · ${info.targetSeason}` : "Registration"}
        title="Team registration"
        description="Sign your team up for the next season. An admin reviews every entry; approved teams are listed below with their division and both player names. Emails and phone numbers are never shown publicly."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="space-y-4">
        {info.isOpen ? (
          <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div>
              <label className={label}>Team name</label>
              <input
                className={field}
                value={form.teamName}
                onChange={(e) => set("teamName")(e.target.value)}
                maxLength={60}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Player 1 name</label>
                <input
                  className={field}
                  value={form.player1Name}
                  onChange={(e) => set("player1Name")(e.target.value)}
                  maxLength={60}
                  required
                />
              </div>
              <div>
                <label className={label}>Player 1 email</label>
                <input
                  className={field}
                  type="email"
                  value={form.player1Email}
                  onChange={(e) => set("player1Email")(e.target.value)}
                  maxLength={160}
                  required
                />
              </div>
              <div>
                <label className={label}>Player 2 name</label>
                <input
                  className={field}
                  value={form.player2Name}
                  onChange={(e) => set("player2Name")(e.target.value)}
                  maxLength={60}
                  required
                />
              </div>
              <div>
                <label className={label}>Player 2 email</label>
                <input
                  className={field}
                  type="email"
                  value={form.player2Email}
                  onChange={(e) => set("player2Email")(e.target.value)}
                  maxLength={160}
                  required
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Phone (optional)</label>
                <input
                  className={field}
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                  maxLength={40}
                />
              </div>
              <div>
                <label className={label}>Previous division</label>
                <select
                  className={field}
                  value={form.previousDivision}
                  onChange={(e) => set("previousDivision")(e.target.value)}
                >
                  <option value="new">New team</option>
                  {Array.from({ length: DIVISION_COUNT }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>
                      Division {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                I have read and accept the{" "}
                <Link to="/terms" className="font-semibold text-primary underline">
                  Terms &amp; Conditions
                </Link>
                .
              </span>
            </label>
            <button type="submit" disabled={busy || !accepted} className="w-full rounded bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
              {busy ? "Sending…" : "Register team"}
            </button>
            {info.paymentDetails ? (
              <div className="rounded border border-border bg-secondary/40 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Payment details
                </h3>
                <p className="mt-1 whitespace-pre-line text-sm">{info.paymentDetails}</p>
              </div>
            ) : null}
          </form>
        ) : (
          <div className="space-y-3 rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-bold uppercase tracking-wide">Registration is closed</h2>
            <p className="text-sm text-muted-foreground">
              Registration for the next season is not open right now. Check back before the season
              starts.
            </p>
            {info.paymentDetails ? (
              <div className="rounded border border-border bg-secondary/40 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Payment details
                </h3>
                <p className="mt-1 whitespace-pre-line text-sm">{info.paymentDetails}</p>
              </div>
            ) : null}
          </div>
        )}

        <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <h2 className="font-display text-lg font-bold text-primary">Before You Register</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            The registration fee is <strong>800 kr per team</strong>, payable via Swish to{" "}
            <strong>123-111 21 43</strong>. Swish message should be your team name. Please send your
            payment before the tournament. Team reservations are strictly first-come,
            first-served, so don&apos;t wait—secure your spot today!
          </p>
        </section>
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
