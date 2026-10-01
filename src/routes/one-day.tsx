import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, MapPin, Trophy, Users, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { submitOnedayRegistration } from "@/lib/oneday.functions";
import { formatOnedayDate, onedayInfoQueryOptions, onedayTeamsQueryOptions } from "@/lib/oneday-query";

export const Route = createFileRoute("/one-day")({
  head: () => ({
    meta: [
      { title: "One-day badminton tournament — Motionsserien" },
      {
        name: "description",
        content: "Register your doubles team for the one-day badminton tournament in Ludvika and see the approved teams.",
      },
      { property: "og:title", content: "One-day badminton tournament — Motionsserien" },
      { property: "og:description", content: "Sign up your doubles team for our one-day badminton event in Ludvika." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.motionsserien.se/one-day" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.motionsserien.se/one-day" }],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(onedayInfoQueryOptions),
      context.queryClient.ensureQueryData(onedayTeamsQueryOptions),
    ]),
  errorComponent: () => <p className="p-6 text-sm text-muted-foreground">Could not load the event. Please refresh.</p>,
  notFoundComponent: () => <p className="p-6 text-sm text-muted-foreground">Page not found.</p>,
  component: OneDayPage,
});

function useCountdown(target: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, []);
  if (!target || now === null) return null;
  const ms = new Date(target.includes("T") ? target : `${target}T09:00`).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1_000);
  return { days, hours, mins, secs };
}

function OneDayPage() {
  const info = useSuspenseQuery(onedayInfoQueryOptions).data;
  const teams = useSuspenseQuery(onedayTeamsQueryOptions).data;
  const countdown = useCountdown(info.eventDate);

  if (!info.visible) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center">
        <Trophy className="mx-auto size-8 text-primary" aria-hidden="true" />
        <h1 className="mt-3 font-display text-2xl font-bold">No one-day event right now</h1>
        <p className="mt-2 text-sm text-muted-foreground">Check back soon for the next one-day tournament.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">One-day tournament</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold leading-tight sm:text-5xl">{info.name}</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {info.eventDate ? (
            <InfoBlock icon={CalendarDays} label="Date" value={formatOnedayDate(info.eventDate)} />
          ) : null}
          {info.venue ? <InfoBlock icon={MapPin} label="Venue" value={info.venue} /> : null}
          <InfoBlock icon={Users} label="Approved teams" value={String(teams.length)} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          {info.isOpen ? (
            <Button asChild size="lg">
              <a href="#register">Register your team</a>
            </Button>
          ) : (
            <span className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold">
              Registration is closed
            </span>
          )}
          {countdown ? (
            <div className="flex gap-2" aria-label="Time until the event">
              {[
                [countdown.days, "days"],
                [countdown.hours, "hrs"],
                [countdown.mins, "min"],
                [countdown.secs, "sec"],
              ].map(([n, l]) => (
                <div key={l} className="min-w-14 rounded-lg border border-border bg-card px-2 py-1.5 text-center">
                  <div className="tabnum font-display text-xl font-bold">{n}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,32rem)_1fr]">
        <div className="space-y-4" id="register">
          {info.isOpen ? (
            <RegistrationForm />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold">Registration is closed</h2>
              <p className="mt-2 text-sm text-muted-foreground">Registration for this event is not open right now.</p>
            </div>
          )}
          {info.paymentDetails ? (
            <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
                <Wallet className="size-5" aria-hidden="true" /> Fee &amp; payment
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{info.paymentDetails}</p>
            </section>
          ) : null}
        </div>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
            <h2 className="font-display text-lg font-bold">Approved teams</h2>
            <span className="tabnum text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {teams.length} teams
            </span>
          </div>
          {teams.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">No approved teams yet. Be the first!</p>
          ) : (
            <ul className="grid gap-3 p-4 sm:grid-cols-2">
              {teams.map((team, i) => (
                <li key={team.id} className="flex gap-3 rounded-lg border border-border bg-background p-3">
                  <span className="tabnum flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{team.team_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {team.player1_name} &amp; {team.player2_name}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/80 p-4">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground";

function RegistrationForm() {
  const submit = useServerFn(submitOnedayRegistration);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ teamName: "", player1Name: "", player2Name: "", email: "", phone: "" });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!terms) return setError("Please accept the Terms & Conditions.");
    setBusy(true);
    try {
      await submit({ data: { ...form, acceptTerms: true } });
      setDone(true);
      void queryClient.invalidateQueries({ queryKey: ["oneday"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      try {
        const parsed = JSON.parse(msg);
        setError(Array.isArray(parsed) ? parsed[0]?.message : msg);
      } catch {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-up/40 bg-up/10 p-6">
        <CheckCircle2 className="size-7 text-up" aria-hidden="true" />
        <h2 className="mt-2 font-display text-xl font-bold">Thanks — you're registered!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your registration is waiting for approval. Your team will appear in the list once it's approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold">Register your team</h2>
      <div>
        <label className={labelCls} htmlFor="od-team">Team name</label>
        <input id="od-team" className={field} required maxLength={60} value={form.teamName} onChange={set("teamName")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="od-p1">Player 1 name</label>
          <input id="od-p1" className={field} required maxLength={80} value={form.player1Name} onChange={set("player1Name")} />
        </div>
        <div>
          <label className={labelCls} htmlFor="od-p2">Player 2 name</label>
          <input id="od-p2" className={field} required maxLength={80} value={form.player2Name} onChange={set("player2Name")} />
        </div>
        <div>
          <label className={labelCls} htmlFor="od-email">Email</label>
          <input id="od-email" type="email" autoComplete="email" className={field} required maxLength={255} value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className={labelCls} htmlFor="od-phone">Phone</label>
          <input id="od-phone" type="tel" autoComplete="tel" className={field} required maxLength={25} value={form.phone} onChange={set("phone")} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        <span>
          I have read and accept the{" "}
          <Link to="/terms" className="font-semibold text-primary underline">Terms &amp; Conditions</Link>.
        </span>
      </label>
      {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sending…" : "Submit registration"}
      </Button>
      <p className="text-xs text-muted-foreground">Email and phone are only seen by the organiser.</p>
    </form>
  );
}
