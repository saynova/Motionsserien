import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, Mail, QrCode } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, ScoreText, StatusPill } from "@/components/tournament-ui";
import { NextSeasonAdmin, SeasonSettingsCard } from "@/components/admin-next-season";
import { MessagesAdmin } from "@/components/messages-admin";
import { VisitorsAdmin } from "@/components/visitors-admin";
import { formatWeekDate, validateScore, type MatchRow } from "@/lib/tournament";
import type { SubmitterDetail } from "@/lib/visitors.functions";
import { TeamContactsAdmin } from "@/components/team-contacts-admin";
import { ComposeEmailAdmin } from "@/components/compose-email-admin";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  adminShuttleOrdersQueryOptions,
  adminStatusQueryOptions,
  bannerQueryOptions,
  remindersQueryOptions,
  submitterDetailsQueryOptions,
  tournamentQueryOptions,
  supportSettingsQueryOptions,
} from "@/lib/tournament-query";
import { sendScoreReminder } from "@/lib/reminders.functions";
import {
  approveShuttleOrders,
  deleteShuttleOrder,
  saveBanner,
  saveSupportSettings,
} from "@/lib/extras.functions";
import {
  adminSignIn,
  adminSignOut,
  approveAllPending,
  approveMatches,
  finalizeWeek,
  regenerateCurrentWeek,
  markNoShow,
  rejectMatch,
  setMatchScore,
  startNewSeason,
} from "@/lib/tournament.functions";

const SECTIONS = [
  { id: "matches", label: "Match scores" },
  { id: "banner", label: "Weekly banner" },
  { id: "shuttles", label: "Shuttle purchases" },
  { id: "support", label: "Donation & sponsor" },
  { id: "messages", label: "Questions" },
  { id: "email", label: "Send email" },
  { id: "contacts", label: "Team contacts" },
  { id: "season", label: "Season settings" },
  { id: "procedure", label: "Weekly procedure" },
  { id: "next-season", label: "Registration & seeding" },
  { id: "new-season", label: "Start new season" },
  { id: "visitors", label: "Visitors" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { section: SectionId } => {
    const raw = String(search["section"] ?? "matches");
    const match = SECTIONS.find((s) => s.id === raw);
    return { section: match ? match.id : "matches" };
  },
  head: () => ({
    meta: [
      { title: "Admin — Motionsserien HT-26" },
      {
        name: "description",
        content:
          "Approve submitted scores, edit results, and generate next week's divisions for the Motionsserien HT-26 badminton ladder.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — Motionsserien HT-26" },
      { property: "og:description", content: "Approve scores and roll the ladder forward." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(tournamentQueryOptions),
      context.queryClient.ensureQueryData(adminStatusQueryOptions),
    ]),
  component: AdminPage,
});


const control = "rounded border border-input bg-card px-3 py-2 text-sm font-medium";
const btn =
  "rounded bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40";
const btnGhost =
  "rounded border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70";

function AdminPage() {
  const status = useQuery(adminStatusQueryOptions);
  return status.data?.unlocked ? <AdminConsole /> : <AdminGate />;
}

function AdminGate() {
  const queryClient = useQueryClient();
  const signIn = useServerFn(adminSignIn);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await signIn({ data: { password } });
      if (!result.ok) {
        toast.error("Incorrect password.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-status"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Restricted"
        title="Admin sign-in"
        description="Enter the shared admin password to approve scores and roll the ladder forward."
      />
      <form onSubmit={onSubmit} className="max-w-sm space-y-4 rounded-lg border border-border bg-card p-6">
        <label className="block space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admin password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            className={`${control} w-full`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className={btn} disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

function AdminConsole() {
  const { data } = useSuspenseQuery(tournamentQueryOptions);
  const queryClient = useQueryClient();

  const signOut = useServerFn(adminSignOut);
  const approveAll = useServerFn(approveAllPending);
  const approveOne = useServerFn(approveMatches);
  const reject = useServerFn(rejectMatch);
  const noShow = useServerFn(markNoShow);
  const saveScore = useServerFn(setMatchScore);
  const finalize = useServerFn(finalizeWeek);
  const regenerate = useServerFn(regenerateCurrentWeek);
  const newSeason = useServerFn(startNewSeason);
  const remind = useServerFn(sendScoreReminder);
  const reminders = useQuery(remindersQueryOptions);
  const submitterDetails = useQuery(submitterDetailsQueryOptions);

  const { season, teams, matches } = data;
  const [week, setWeek] = useState(season.current_week);
  const [busy, setBusy] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { section } = Route.useSearch();
  const navigate = Route.useNavigate();


  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });


  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "Unknown";
  const weeks = [...new Set(matches.map((m) => m.week_no))].sort((a, b) => a - b);
  const weekMatches = matches
    .filter((m) => m.week_no === week)
    .sort((a, b) => a.division - b.division || a.match_no - b.match_no);
  const pending = weekMatches.filter((m) => m.status === "pending");
  const notFinal = weekMatches.filter((m) => m.status !== "final");

  const lastReminderFor = (matchId: string) =>
    reminders.data?.find((r) => r.match_id === matchId)?.sent_at;

  const detailFor = (matchId: string) =>
    submitterDetails.data?.find((d) => d.matchId === matchId);

  async function sendReminder(matchId: string) {
    setBusy(true);
    try {
      const result = await remind({ data: { matchId } });
      await queryClient.invalidateQueries({ queryKey: ["score-reminders", "admin"] });
      toast.success(
        result.sent > 0
          ? `Reminder sent to ${result.sent} player${result.sent === 1 ? "" : "s"}.`
          : "No reminder delivered — those addresses are blocked.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reminder.");
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["tournament"] });
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`${season.name} · Current week ${season.current_week} of ${season.total_weeks}`}
        title="Admin console"
        description="Approve submitted results, correct any score, then finalise the week to generate the next one with promotion and relegation applied."
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Week
            </span>
            <select className={control} value={week} onChange={(e) => setWeek(Number(e.target.value))}>
              {weeks.map((w) => (
                <option key={w} value={w}>
                  Week {w} · {formatWeekDate(season.start_monday, w)}
                </option>
              ))}
            </select>
          </label>

          <button
            className={btn}
            disabled={busy || pending.length === 0}
            onClick={() =>
              run(
                () => approveAll({ data: { weekNo: week } }),
                `Approved ${pending.length} pending score${pending.length === 1 ? "" : "s"}.`,
              )
            }
          >
            Approve all pending ({pending.length})
          </button>

          <button
            className={btnGhost}
            disabled={busy}
            onClick={() =>
              run(async () => {
                const result = await finalize();
                if (result.seasonComplete) {
                  toast.info("Season complete — start a new season below to seed the next one.");
                }
              }, "Week finalised and the next week generated.")
            }
          >
            Finalise week {season.current_week} & generate next
          </button>

          <button
            className={btnGhost}
            disabled={busy || season.current_week <= 1}
            onClick={() =>
              run(
                () => regenerate(),
                `Week ${season.current_week} rebuilt from week ${season.current_week - 1} results.`,
              )
            }
          >
            Rebuild week {season.current_week} from last week
          </button>

          <button className={btnGhost} disabled={busy} onClick={() => run(async () => {
            await signOut();
            await queryClient.invalidateQueries({ queryKey: ["admin-status"] });
          }, "Signed out.")}>
            Sign out
          </button>
        </div>
      </PageHeader>

      <nav
        aria-label="Admin sections"
        className="glass-surface mt-6 flex gap-1.5 overflow-x-auto rounded-xl border border-border p-2"
      >
        {SECTIONS.map((item) => {
          const active = item.id === section;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate({ search: { section: item.id }, resetScroll: false })}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {item.label}
              {item.id === "matches" && pending.length > 0 ? (
                <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[0.65rem] font-bold text-accent-foreground">
                  {pending.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 space-y-6">
        {section === "banner" ? <BannerEditor /> : null}
        {section === "shuttles" ? <ShuttleAdmin /> : null}
        {section === "support" ? <SupportSettingsEditor /> : null}
        {section === "messages" ? <MessagesAdmin /> : null}
        {section === "email" ? <ComposeEmailAdmin /> : null}
        {section === "contacts" ? <TeamContactsAdmin /> : null}
        {section === "season" ? <SeasonSettingsCard /> : null}
        {section === "procedure" ? (
          <WeeklyProcedure
            week={week}
            currentWeek={season.current_week}
            totalWeeks={season.total_weeks}
            pending={pending.length}
            missing={weekMatches.filter((m) => m.status === "scheduled").length}
            notFinal={notFinal.length}
          />
        ) : null}
        {section === "next-season" ? <NextSeasonAdmin /> : null}
        {section === "visitors" ? <VisitorsAdmin /> : null}

        {section === "matches" ? (
          <>
            {notFinal.length > 0 ? (
              <p className="rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
                {notFinal.length} match{notFinal.length === 1 ? "" : "es"} in week {week} are not
                final yet. Pending submissions must be approved or rejected; matches with no score at
                all become 0–0 when you finalise the week.
              </p>
            ) : null}

            <div className="glass-surface flex flex-wrap items-center gap-2 rounded-xl border border-border px-4 py-3">
              <span className="text-sm font-semibold">{selected.size} selected for approval</span>
              <button
                className={btn}
                disabled={busy || selected.size === 0}
                onClick={() =>
                  run(async () => {
                    await approveOne({ data: { matchIds: [...selected] } });
                    setSelected(new Set());
                  }, "Selected scores approved.")
                }
              >
                Approve selected
              </button>
              <button
                className={btnGhost}
                disabled={pending.length === 0}
                onClick={() => setSelected(new Set(pending.map((m) => m.id)))}
              >
                Select all waiting ({pending.length})
              </button>
              <button
                className={btnGhost}
                disabled={selected.size === 0}
                onClick={() => setSelected(new Set())}
              >
                Clear
              </button>
            </div>

            <div className="space-y-3">
              {[...new Set(weekMatches.map((m) => m.division))].map((division) => {
                const group = weekMatches.filter((m) => m.division === division);
                const waiting = group.filter((m) => m.status !== "final").length;
                return (
                  <DivisionGroup key={division} division={division} waiting={waiting}>
                    {group.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        nameA={teamName(match.team_a_id)}
                        nameB={teamName(match.team_b_id)}
                        busy={busy}
                        selected={selected.has(match.id)}
                        onToggleSelect={() => toggleSelect(match.id)}
                        detail={detailFor(match.id)}
                        lastReminder={lastReminderFor(match.id)}
                        onRemind={() => sendReminder(match.id)}
                        onApprove={() =>
                          run(
                            () => approveOne({ data: { matchIds: [match.id] } }),
                            "Score approved.",
                          )
                        }
                        onReject={() =>
                          run(() => reject({ data: { matchId: match.id } }), "Score cleared.")
                        }
                        onNoShow={() =>
                          run(() => noShow({ data: { matchId: match.id } }), "Marked as 0–0.")
                        }
                        onSave={(score) =>
                          run(
                            () => saveScore({ data: { matchId: match.id, ...score } }),
                            "Score saved.",
                          )
                        }
                      />
                    ))}
                  </DivisionGroup>
                );
              })}
            </div>
          </>
        ) : null}

        {section === "new-season" ? (
          <section className="glass-surface rounded-xl border border-border p-6">
            <h2 className="font-display text-2xl font-bold">Start a new season</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Available once the final week is finalised. Teams are seeded into the new season from
              the divisions they finished in.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Season name
                </span>
                <input
                  className={control}
                  value={seasonName}
                  placeholder="Motionsserien VT-27"
                  onChange={(e) => setSeasonName(e.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Starting Monday
                </span>
                <input
                  type="date"
                  className={control}
                  value={seasonStart}
                  onChange={(e) => setSeasonStart(e.target.value)}
                />
              </label>
              <button
                className={btn}
                disabled={busy || !seasonName || !seasonStart}
                onClick={() =>
                  run(
                    () => newSeason({ data: { name: seasonName, startMonday: seasonStart } }),
                    "New season created with week 1 scheduled.",
                  )
                }
              >
                Start new season
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}


type Score = {
  s1a: number;
  s1b: number;
  s2a: number;
  s2b: number;
  s3a: number | null;
  s3b: number | null;
};

function WeeklyProcedure({
  week,
  currentWeek,
  totalWeeks,
  pending,
  missing,
  notFinal,
}: {
  week: number;
  currentWeek: number;
  totalWeeks: number;
  pending: number;
  missing: number;
  notFinal: number;
}) {
  const [open, setOpen] = useState(false);
  const steps = [
    `Chase missing results — ${missing} match${missing === 1 ? "" : "es"} in week ${week} still have no score. Teams have 2 days; anything missing counts as a no-show 0–0.`,
    `Approve submitted scores — ${pending} waiting for approval. Open a division below, click a match and approve, edit or reject it.`,
    `Finalise week ${currentWeek} — this locks the results (${notFinal} not final yet) and applies promotion and relegation.`,
    `Next week is generated automatically from the final standings. Use "Rebuild week ${currentWeek} from last week" if you corrected an earlier result.`,
    `After week ${totalWeeks}, open registration and set up the seeding board for the next season.`,
  ];

  return (
    <section className="mt-6 mb-6 rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="text-lg font-bold uppercase tracking-wide">Weekly procedure</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {open ? "Hide" : "Show"} · week {currentWeek} of {totalWeeks}
        </span>
      </button>
      {open ? (
        <ol className="list-decimal space-y-2 border-t border-border px-8 py-4 text-sm text-muted-foreground">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function DivisionGroup({
  division,
  waiting,
  children,
}: {
  division: number;
  waiting: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(waiting > 0);
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-secondary/50 px-4 py-2.5 text-left"
      >
        <span className="text-sm font-bold uppercase tracking-wider text-primary">
          Division {division}
        </span>
        <span className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {waiting > 0 ? (
            <span className="rounded bg-accent/20 px-2 py-0.5 text-accent-foreground">
              {waiting} waiting
            </span>
          ) : (
            <span>All final</span>
          )}
          <span>{open ? "−" : "+"}</span>
        </span>
      </button>
      {open ? <div className="space-y-2 p-3">{children}</div> : null}
    </section>
  );
}

function MatchCard({
  match,
  nameA,
  nameB,
  busy,
  selected,
  onToggleSelect,
  detail,
  lastReminder,
  onRemind,
  onApprove,
  onReject,
  onNoShow,
  onSave,
}: {
  match: MatchRow;
  nameA: string;
  nameB: string;
  busy: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  detail?: SubmitterDetail | undefined;
  lastReminder?: string | undefined;
  onRemind: () => void;
  onApprove: () => void;
  onReject: () => void;
  onNoShow: () => void;
  onSave: (score: Score) => void;
}) {
  const [open, setOpen] = useState(match.status === "pending");
  const [editing, setEditing] = useState(false);
  const asText = (v: number | null) => (v == null ? "" : String(v));
  const [fields, setFields] = useState({
    s1a: asText(match.s1a),
    s1b: asText(match.s1b),
    s2a: asText(match.s2a),
    s2b: asText(match.s2b),
    s3a: asText(match.s3a),
    s3b: asText(match.s3b),
  });

  const cell = "w-14 rounded border border-input bg-background px-2 py-1.5 text-center tabnum";

  function save() {
    const n = (v: string) => (v.trim() === "" ? null : Number(v));
    const score: Score = {
      s1a: Number(fields.s1a),
      s1b: Number(fields.s1b),
      s2a: Number(fields.s2a),
      s2b: Number(fields.s2b),
      s3a: n(fields.s3a),
      s3b: n(fields.s3b),
    };
    if ([score.s1a, score.s1b, score.s2a, score.s2b].some((v) => !Number.isFinite(v))) {
      toast.error("Fill in Set 1 and Set 2 for both teams.");
      return;
    }
    const problem = validateScore(score, true);
    if (problem) {
      toast.error(problem);
      return;
    }
    onSave(score);
    setEditing(false);
  }

  return (
    <article className="rounded-lg border border-border bg-background/40 px-4 py-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2"
      >
        {match.status === "pending" ? (
          <input
            type="checkbox"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={onToggleSelect}
            className="size-4 accent-primary"
            aria-label={`Select ${nameA} v ${nameB} for approval`}
          />
        ) : null}
        <span className="tabnum text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Div {match.division} · {match.start_time} · Court {match.court}
        </span>
        <span className="flex-1 min-w-[14rem] font-semibold">
          {nameA} <span className="text-muted-foreground">v</span> {nameB}
        </span>
        <ScoreText
          match={match}
          teamName={(id) => (id === match.team_a_id ? nameA : nameB)}
        />
        <StatusPill match={match} />
        {match.submitted_by ? (
          <span className="text-xs text-muted-foreground">by {match.submitted_by}</span>
        ) : null}
        {match.status === "scheduled" ? (
          <span className="ml-auto flex items-center gap-2">
            {lastReminder ? (
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Reminded {new Date(lastReminder).toLocaleDateString("sv-SE")}
              </span>
            ) : null}
            <button
              className={btnGhost}
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                onRemind();
              }}
              title="Email both teams about the missing score"
            >
              <Mail className="mr-1.5 inline size-3.5" aria-hidden="true" />
              Send reminder
            </button>
          </span>
        ) : null}
        <span className="text-xs font-semibold text-muted-foreground">{open ? "−" : "+"}</span>
      </div>

      {!open ? null : (
      <>
      {detail && detail.submittedAt ? (
        <dl className="mt-3 grid gap-x-6 gap-y-1 rounded border border-border bg-background/50 p-3 text-xs sm:grid-cols-2">
          <div className="sm:col-span-2 font-semibold uppercase tracking-widest text-muted-foreground">
            Submitted by
          </div>
          {[
            ["Name", detail.submittedBy || "—"],
            ["Time", new Date(detail.submittedAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })],
            ["IP address", detail.ip || "—"],
            ["Device", detail.device || "—"],
            ["Location", detail.location || "—"],
          ].map(([term, value]) => (
            <div key={term} className="flex gap-2">
              <dt className="text-muted-foreground">{term}:</dt>
              <dd className="break-all font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {match.status === "pending" ? (
          <>
            <button className={btnGhost} disabled={busy} onClick={onApprove}>
              Approve
            </button>
            <button className={btnGhost} disabled={busy} onClick={onReject}>
              Reject
            </button>
          </>
        ) : null}
        <button className={btnGhost} disabled={busy} onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel edit" : "Edit score"}
        </button>
        <button className={btnGhost} disabled={busy} onClick={onNoShow}>
          Mark 0–0 (no show)
        </button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2 rounded border border-border bg-background/40 p-3 text-sm">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Team</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Set 1</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Set 2</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Set 3</span>

            <span className="font-medium">{nameA}</span>
            {(["s1a", "s2a", "s3a"] as const).map((key) => (
              <input
                key={key}
                className={cell}
                inputMode="numeric"
                value={fields[key]}
                onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                aria-label={`${nameA} ${key}`}
              />
            ))}

            <span className="font-medium">{nameB}</span>
            {(["s1b", "s2b", "s3b"] as const).map((key) => (
              <input
                key={key}
                className={cell}
                inputMode="numeric"
                value={fields[key]}
                onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                aria-label={`${nameB} ${key}`}
              />
            ))}
          </div>
          <button className={btn} disabled={busy} onClick={save}>
            Save as final
          </button>
        </div>
      ) : null}
      </>
      )}
    </article>
  );
}

function BannerEditor() {
  const queryClient = useQueryClient();
  const banner = useQuery(bannerQueryOptions);
  const save = useServerFn(saveBanner);
  const [title, setTitle] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const currentTitle = title ?? banner.data?.title ?? "";
  const currentMessage = message ?? banner.data?.message ?? "";
  const isActive = banner.data?.is_active === true;

  async function persist(nextActive: boolean) {
    setBusy(true);
    try {
      await save({ data: { title: currentTitle, message: currentMessage, isActive: nextActive } });
      await queryClient.invalidateQueries({ queryKey: ["banner"] });
      toast.success(nextActive ? "Banner saved and shown." : "Banner hidden.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the banner.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-2xl font-bold uppercase tracking-wide">Weekly banner</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Shown at the top of every page with a trophy icon. Enter the weekly champion on the left and
        an announcement on the right.
      </p>
      <div className="mt-4 space-y-3">
        <label className="block space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Weekly champion
          </span>
          <input
            className={`${control} w-full`}
            value={currentTitle}
            maxLength={120}
            placeholder="e.g. Kerala"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Announcement (optional)
          </span>
          <textarea
            className={`${control} w-full`}
            rows={3}
            maxLength={600}
            value={currentMessage}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className={btn} disabled={busy} onClick={() => persist(true)}>
            Save &amp; show banner
          </button>
          <button className={btnGhost} disabled={busy || !isActive} onClick={() => persist(false)}>
            Hide banner
          </button>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {isActive ? "Currently visible" : "Currently hidden"}
          </span>
        </div>
      </div>
    </section>
  );
}

function SupportSettingsEditor() {
  const queryClient = useQueryClient();
  const settings = useQuery(supportSettingsQueryOptions);
  const save = useServerFn(saveSupportSettings);
  const [open, setOpen] = useState(false);
  const [donationVisible, setDonationVisible] = useState<boolean | null>(null);
  const [sponsorVisible, setSponsorVisible] = useState<boolean | null>(null);
  const [sponsorLabel, setSponsorLabel] = useState<string | null>(null);
  const [sponsorDetails, setSponsorDetails] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [removeQr, setRemoveQr] = useState(false);
  const [busy, setBusy] = useState(false);

  const donation = donationVisible ?? settings.data?.donation_visible ?? false;
  const sponsor = sponsorVisible ?? settings.data?.sponsor_visible ?? false;
  const label = sponsorLabel ?? settings.data?.sponsor_label ?? "This session is sponsored by:";
  const details = sponsorDetails ?? settings.data?.sponsor_details ?? "";

  function chooseImage(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("The QR image must be smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      const base64 = value.split(",")[1];
      if (!base64) return;
      setQrImage({ base64, mimeType: file.type });
      setRemoveQr(false);
    };
    reader.readAsDataURL(file);
  }

  async function persist() {
    setBusy(true);
    try {
      await save({
        data: {
          donationVisible: donation,
          sponsorVisible: sponsor,
          sponsorLabel: label,
          sponsorDetails: details,
          qrImage,
          removeQr,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["support-settings"] });
      setQrImage(null);
      setRemoveQr(false);
      toast.success("Donation and sponsor settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save these settings.");
    } finally {
      setBusy(false);
    }
  }

  const hasStoredQr = Boolean(settings.data?.qr_image_url) && !removeQr;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-6 rounded-lg border border-border bg-card">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-between rounded-lg px-6 py-4 text-left">
          <span>
            <span className="block text-xl font-bold uppercase">Donation &amp; sponsor</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Control the donation button, Swish QR code and sponsor banner.
            </span>
          </span>
          <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded border border-border bg-secondary/30 p-3">
              <span>
                <span className="block font-semibold">Show donation button</span>
                <span className="block text-xs text-muted-foreground">Visible in the header on every page.</span>
              </span>
              <Switch checked={donation} onCheckedChange={setDonationVisible} />
            </label>
            <div className="rounded border border-border bg-secondary/30 p-3">
              <p className="font-semibold">Swish QR code</p>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG or WebP. Maximum 2 MB.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {(qrImage || hasStoredQr) && !removeQr ? (
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded border border-border bg-background p-1">
                    <img
                      src={qrImage ? `data:${qrImage.mimeType};base64,${qrImage.base64}` : settings.data?.qr_image_url ?? ""}
                      alt="Current Swish QR code"
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex size-20 items-center justify-center rounded border border-dashed border-border text-muted-foreground">
                    <QrCode className="size-8" aria-hidden="true" />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <label>
                      {hasStoredQr || qrImage ? "Replace image" : "Upload image"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => chooseImage(event.target.files?.[0])}
                      />
                    </label>
                  </Button>
                  {hasStoredQr || qrImage ? (
                    <Button variant="outline" size="sm" onClick={() => { setQrImage(null); setRemoveQr(true); }}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded border border-border bg-secondary/30 p-3">
              <span>
                <span className="block font-semibold">Show sponsor banner</span>
                <span className="block text-xs text-muted-foreground">Shown below the weekly champion banner.</span>
              </span>
              <Switch checked={sponsor} onCheckedChange={setSponsorVisible} />
            </label>
            <label className="block space-y-1">
              <span className="block text-xs font-semibold uppercase text-muted-foreground">Sponsor heading</span>
              <input
                className={`${control} w-full`}
                maxLength={120}
                value={label}
                placeholder="This session is sponsored by:"
                onChange={(event) => setSponsorLabel(event.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="block text-xs font-semibold uppercase text-muted-foreground">Sponsor details</span>
              <textarea
                className={`${control} w-full`}
                rows={4}
                maxLength={300}
                value={details}
                placeholder="Sponsor name and short details"
                onChange={(event) => setSponsorDetails(event.target.value)}
              />
            </label>
          </div>
        </div>
        <Button className="mt-5" disabled={busy} onClick={persist}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ShuttleAdmin() {
  const queryClient = useQueryClient();
  const orders = useQuery(adminShuttleOrdersQueryOptions);
  const approve = useServerFn(approveShuttleOrders);
  const remove = useServerFn(deleteShuttleOrder);
  const [busy, setBusy] = useState(false);

  const rows = orders.data ?? [];
  const pending = rows.filter((o) => o.status === "pending");
  const approvedTotal = rows
    .filter((o) => o.status === "approved")
    .reduce((sum, o) => sum + o.quantity, 0);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["shuttle-orders"] });
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-2xl font-bold uppercase tracking-wide">Shuttle purchases</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Orders appear in the public list only after approval. Approved so far: {approvedTotal}{" "}
        shuttles.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className={btn}
          disabled={busy || pending.length === 0}
          onClick={() =>
            run(
              () => approve({ data: { orderIds: null } }),
              `Approved ${pending.length} order${pending.length === 1 ? "" : "s"}.`,
            )
          }
        >
          Approve all pending ({pending.length})
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No shuttle orders yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-secondary/30 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-semibold">{order.team_name}</span>
                <span className="text-muted-foreground"> · {order.buyer_name}</span>
                <span className="tabnum font-semibold"> · {order.quantity} shuttles</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded border border-border bg-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {order.status}
                </span>
                {order.status === "pending" ? (
                  <button
                    className={btnGhost}
                    disabled={busy}
                    onClick={() =>
                      run(() => approve({ data: { orderIds: [order.id] } }), "Order approved.")
                    }
                  >
                    Approve
                  </button>
                ) : null}
                <button
                  className={btnGhost}
                  disabled={busy}
                  onClick={() => run(() => remove({ data: { orderId: order.id } }), "Order removed.")}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
