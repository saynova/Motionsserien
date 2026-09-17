import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/tournament-ui";
import { formatWeekDate, validateScore } from "@/lib/tournament";
import { tournamentQueryOptions } from "@/lib/tournament-query";
import { submitScore } from "@/lib/tournament.functions";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit a match score — Motionsserien HT-26" },
      {
        name: "description",
        content:
          "Report your Monday badminton result: best of three sets, Set 3 to 11 points only when the first two sets are split.",
      },
      { property: "og:title", content: "Submit a match score — Motionsserien HT-26" },
      {
        property: "og:description",
        content: "Report your result straight after play. An admin approves it before it counts.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tournamentQueryOptions),
  component: SubmitPage,
});

const numberField =
  "w-16 rounded border border-input bg-card px-2 py-2 text-center text-base font-semibold tabnum";

function SubmitPage() {
  const { data } = useSuspenseQuery(tournamentQueryOptions);
  const queryClient = useQueryClient();
  const send = useServerFn(submitScore);
  const { season, teams, matches } = data;

  const [week, setWeek] = useState(season.current_week);
  const [division, setDivision] = useState<number | "">("");
  const [matchId, setMatchId] = useState("");
  const [name, setName] = useState("");
  const [s1a, setS1a] = useState("");
  const [s1b, setS1b] = useState("");
  const [s2a, setS2a] = useState("");
  const [s2b, setS2b] = useState("");
  const [s3a, setS3a] = useState("");
  const [s3b, setS3b] = useState("");
  const [busy, setBusy] = useState(false);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "Unknown";
  const weeks = [...new Set(matches.map((m) => m.week_no))].sort((a, b) => a - b);

  const openMatches = useMemo(
    () =>
      matches
        .filter((m) => m.week_no === week && m.status === "scheduled")
        .filter((m) => (division === "" ? true : m.division === division))
        .sort((a, b) => a.division - b.division || a.match_no - b.match_no),
    [matches, week, division],
  );

  const awaitingMatches = useMemo(
    () =>
      matches
        .filter((m) => m.week_no === week && m.status === "pending")
        .filter((m) => (division === "" ? true : m.division === division))
        .sort((a, b) => a.division - b.division || a.match_no - b.match_no),
    [matches, week, division],
  );

  const selected = openMatches.find((m) => m.id === matchId);

  const n = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const set1Winner = Number.isFinite(n(s1a)) && Number.isFinite(n(s1b)) ? n(s1a) > n(s1b) : null;
  const set2Winner = Number.isFinite(n(s2a)) && Number.isFinite(n(s2b)) ? n(s2a) > n(s2b) : null;
  const needsThird = set1Winner !== null && set2Winner !== null && set1Winner !== set2Winner;

  const reset = () => {
    setMatchId("");
    setS1a("");
    setS1b("");
    setS2a("");
    setS2b("");
    setS3a("");
    setS3b("");
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) {
      toast.error("Pick the match you played.");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Enter your name so the admin knows who reported it.");
      return;
    }
    const score = {
      s1a: n(s1a),
      s1b: n(s1b),
      s2a: n(s2a),
      s2b: n(s2b),
      s3a: needsThird ? n(s3a) : null,
      s3b: needsThird ? n(s3b) : null,
    };
    if ([score.s1a, score.s1b, score.s2a, score.s2b].some((v) => !Number.isFinite(v))) {
      toast.error("Fill in both scores for Set 1 and Set 2.");
      return;
    }
    if (needsThird && (!Number.isFinite(score.s3a as number) || !Number.isFinite(score.s3b as number))) {
      toast.error("The first two sets are split, so Set 3 is needed.");
      return;
    }
    const problem = validateScore(score);
    if (problem) {
      toast.error(problem);
      return;
    }

    setBusy(true);
    try {
      await send({ data: { matchId: selected.id, submittedBy: name.trim(), ...score } });
      await queryClient.invalidateQueries({ queryKey: ["tournament"] });
      reset();
      toast.success("Score submitted. An admin will approve it before the ladder updates.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit that score.");
    } finally {
      setBusy(false);
    }
  }

  const label = "block text-xs font-semibold uppercase tracking-widest text-muted-foreground";
  const control = "w-full rounded border border-input bg-card px-3 py-2 text-sm font-medium";

  return (
    <>
      <PageHeader
        eyebrow={`${season.name} · Week ${week} · ${formatWeekDate(season.start_monday, week)}`}
        title="Submit a score"
        description="Best of three sets. Set 1 and Set 2 are played to 21. Set 3 is played only when the first two sets are split 1–1, and only to 11 points. Team A is the first-listed team."
      />

      <form
        onSubmit={onSubmit}
        className="max-w-2xl space-y-6 rounded-lg border border-border bg-card p-6"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1">
            <span className={label}>Week</span>
            <select
              className={control}
              value={week}
              onChange={(e) => {
                setWeek(Number(e.target.value));
                reset();
              }}
            >
              {weeks.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={label}>Division</span>
            <select
              className={control}
              value={division}
              onChange={(e) => {
                setDivision(e.target.value === "" ? "" : Number(e.target.value));
                setMatchId("");
              }}
            >
              <option value="">All divisions</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Division {d}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={label}>Your name</span>
            <input
              className={control}
              value={name}
              maxLength={60}
              placeholder="Reported by"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className={label}>Match</span>
          <select
            className={control}
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
          >
            <option value="">Select your match…</option>
            {openMatches.map((m) => (
              <option key={m.id} value={m.id}>
                Div {m.division} · {m.start_time} · Court {m.court} · {teamName(m.team_a_id)} v{" "}
                {teamName(m.team_b_id)}
                {m.status === "pending" ? " (already submitted)" : ""}
              </option>
            ))}
          </select>
        </label>

        {openMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every match in week {week} is already final. Ask an admin if a score needs changing.
          </p>
        ) : null}

        {selected ? (
          <div className="space-y-4 rounded border border-border bg-background/40 p-4">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-3 text-sm">
              <div />
              <span className={label}>Set 1</span>
              <span className={label}>Set 2</span>
              <span className={label}>Set 3</span>

              <span className="font-semibold">{teamName(selected.team_a_id)}</span>
              <input
                className={numberField}
                inputMode="numeric"
                value={s1a}
                onChange={(e) => setS1a(e.target.value)}
                aria-label="Team A set 1"
              />
              <input
                className={numberField}
                inputMode="numeric"
                value={s2a}
                onChange={(e) => setS2a(e.target.value)}
                aria-label="Team A set 2"
              />
              <input
                className={numberField}
                inputMode="numeric"
                value={s3a}
                disabled={!needsThird}
                onChange={(e) => setS3a(e.target.value)}
                aria-label="Team A set 3"
              />

              <span className="font-semibold">{teamName(selected.team_b_id)}</span>
              <input
                className={numberField}
                inputMode="numeric"
                value={s1b}
                onChange={(e) => setS1b(e.target.value)}
                aria-label="Team B set 1"
              />
              <input
                className={numberField}
                inputMode="numeric"
                value={s2b}
                onChange={(e) => setS2b(e.target.value)}
                aria-label="Team B set 2"
              />
              <input
                className={numberField}
                inputMode="numeric"
                value={s3b}
                disabled={!needsThird}
                onChange={(e) => setS3b(e.target.value)}
                aria-label="Team B set 3"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {needsThird
                ? "Sets are split 1–1, so enter Set 3 up to 11 points."
                : "Set 3 unlocks automatically if the first two sets are split 1–1."}
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy || !selected}
          className="rounded bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Submitting…" : "Submit result"}
        </button>

        <p className="rounded border border-accent/40 bg-accent/10 p-3 text-sm">
          You will have 2 days to submit the score. Any missing result will be treated as a no-show
          and will be given 0–0.
        </p>
      </form>
    </>
  );
}
