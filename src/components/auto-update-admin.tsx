import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  getAutoUpdateSettings,
  getReminderSettings,
  saveAutoUpdateSettings,
  saveReminderSettings,
} from "@/lib/auto-update.functions";
import { memoriesQueryOptions } from "@/lib/tournament-query";
import { setHomepage, type Homepage } from "@/lib/memories.functions";
import { getScoreUnlockSettings, saveScoreUnlock, saveWeeklyScoreWindow } from "@/lib/tournament.functions";

const control = "rounded border border-input bg-card px-3 py-2 text-sm font-medium";
const btn =
  "rounded bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40";

const DAY_CHOICES = [
  { value: 0, label: "Match day (Monday) — same evening" },
  { value: 1, label: "Tuesday — 1 day after the matches" },
  { value: 2, label: "Wednesday — 2 days after" },
  { value: 3, label: "Thursday — 3 days after" },
  { value: 4, label: "Friday — 4 days after" },
  { value: 5, label: "Saturday — 5 days after" },
  { value: 6, label: "Sunday — 6 days after" },
  { value: 7, label: "Next Monday — before the next games" },
];

export function AutoUpdateAdmin() {
  const settings = useQuery({
    queryKey: ["auto-update-settings"],
    queryFn: () => getAutoUpdateSettings(),
  });

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-2xl font-bold uppercase tracking-wide">Automatic updates</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Score approval and the next week&apos;s schedule are set separately, so you can approve the
        results at the submission deadline and publish the new schedule later. All times are Swedish
        time.
      </p>

      <StageBlock
        stage="approve"
        title="Automatic score approval"
        description="At this moment every submitted score is approved and any match with no score is recorded as a 0–0 no-show. Standings update straight away."
        toggleLabel="Approve scores automatically"
        toggleHint="Turn this off to approve every score by hand under Match scores."
        nextLabel="Next score approval"
        offLabel="Automatic score approval is switched off — approve scores yourself under Match scores."
        enabled={settings.data?.approveEnabled ?? true}
        offsetDays={settings.data?.approveOffsetDays ?? 2}
        time={settings.data?.approveTime ?? "10:00"}
        nextRun={settings.data?.approveNextRun ?? null}
        loaded={Boolean(settings.data)}
      />

      <div className="mt-8 border-t border-border pt-6">
        <StageBlock
          stage="schedule"
          title="Automatic schedule update"
          description="At this moment promotion and relegation are applied and the next week's divisions, courts and times are published."
          toggleLabel="Update the schedule automatically"
          toggleHint="Turn this off to publish each new week by hand."
          nextLabel="Next schedule update"
          offLabel="Automatic schedule updates are switched off — finalise each week yourself under Match scores."
          enabled={settings.data?.enabled ?? true}
          offsetDays={settings.data?.offsetDays ?? 7}
          time={settings.data?.time ?? "11:00"}
          nextRun={settings.data?.nextRun ?? null}
          currentWeek={settings.data?.currentWeek}
          loaded={Boolean(settings.data)}
        />
      </div>

      <HomepageBlock />

      <WeeklyWindowBlock />

      <ScoreUnlockBlock />

      <ReminderSettingsBlock />
    </section>
  );
}

function ScoreUnlockBlock() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["score-unlock"], queryFn: () => getScoreUnlockSettings() });
  const save = useServerFn(saveScoreUnlock);
  const [enabled, setEnabled] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:30");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loaded || !settings.data) return;
    if (settings.data.unlockAt) {
      const [d = "", t = "18:30"] = settings.data.unlockAt.split(" ");
      setEnabled(true);
      setDate(d);
      setTime(t);
    }
    setLoaded(true);
  }, [loaded, settings.data]);

  async function persist() {
    if (enabled && !date) {
      toast.error("Choose a date.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { unlockAt: enabled ? `${date} ${time}` : null } });
      await queryClient.invalidateQueries({ queryKey: ["score-unlock"] });
      await queryClient.invalidateQueries({ queryKey: ["tournament"] });
      toast.success(enabled ? "Automatic unlock scheduled." : "Automatic unlock switched off.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this setting.");
    } finally {
      setBusy(false);
    }
  }

  const data = settings.data;
  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="text-xl font-bold uppercase tracking-wide">Automatic score submission unlock</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Keep &quot;Submit Your Score&quot; locked and open it automatically at the date and time you choose
        (Swedish time). Saving a time locks the button until then.
      </p>

      <label className="mt-4 flex max-w-2xl items-center justify-between gap-4 rounded border border-border bg-secondary/30 p-3">
        <span>
          <span className="block font-semibold">Unlock automatically</span>
          <span className="block text-xs text-muted-foreground">
            Turn this off to open the button yourself under Match scores.
          </span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Date</span>
          <input
            type="date"
            className={`${control} w-full`}
            value={date}
            disabled={!enabled}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Time</span>
          <input
            type="time"
            className={`${control} w-full`}
            value={time}
            disabled={!enabled}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
      </div>

      <p className="mt-3 text-sm">
        {!data ? null : data.open ? (
          <span className="font-semibold text-primary">Open now — players can submit scores.</span>
        ) : data.unlockAt ? (
          <>
            <span className="font-semibold">Locked until:</span> <span className="tabnum">{data.unlockAt}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Locked — no automatic unlock scheduled.</span>
        )}
      </p>

      <button className={`${btn} mt-4`} disabled={busy} onClick={persist}>
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function StageBlock({
  stage,
  title,
  description,
  toggleLabel,
  toggleHint,
  nextLabel,
  offLabel,
  enabled: initialEnabled,
  offsetDays: initialOffset,
  time: initialTime,
  nextRun,
  currentWeek,
  loaded: dataLoaded,
}: {
  stage: "approve" | "schedule";
  title: string;
  description: string;
  toggleLabel: string;
  toggleHint: string;
  nextLabel: string;
  offLabel: string;
  enabled: boolean;
  offsetDays: number;
  time: string;
  nextRun: string | null;
  currentWeek?: number | undefined;
  loaded: boolean;
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveAutoUpdateSettings);

  const [enabled, setEnabled] = useState(initialEnabled);
  const [offsetDays, setOffsetDays] = useState(initialOffset);
  const [time, setTime] = useState(initialTime);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loaded || !dataLoaded) return;
    setEnabled(initialEnabled);
    setOffsetDays(initialOffset);
    setTime(initialTime);
    setLoaded(true);
  }, [loaded, dataLoaded, initialEnabled, initialOffset, initialTime]);

  async function persist() {
    setBusy(true);
    try {
      await save({ data: { stage, enabled, offsetDays, time } });
      await queryClient.invalidateQueries({ queryKey: ["auto-update-settings"] });
      toast.success(
        stage === "approve" ? "Score approval time saved." : "Schedule update time saved.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this setting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3 className="text-xl font-bold uppercase tracking-wide">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>

      <label className="mt-4 flex max-w-2xl items-center justify-between gap-4 rounded border border-border bg-secondary/30 p-3">
        <span>
          <span className="block font-semibold">{toggleLabel}</span>
          <span className="block text-xs text-muted-foreground">{toggleHint}</span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Day
          </span>
          <select
            className={`${control} w-full`}
            value={offsetDays}
            disabled={!enabled}
            onChange={(event) => setOffsetDays(Number(event.target.value))}
          >
            {DAY_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Time
          </span>
          <input
            type="time"
            className={`${control} w-full`}
            value={time}
            disabled={!enabled}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
      </div>

      <p className="mt-3 text-sm">
        {nextRun ? (
          <>
            <span className="font-semibold">{nextLabel}:</span>{" "}
            <span className="tabnum">{nextRun}</span>
            {currentWeek ? <> (week {currentWeek})</> : null}
          </>
        ) : (
          <span className="text-muted-foreground">{offLabel}</span>
        )}
      </p>

      <button className={`${btn} mt-4`} disabled={busy} onClick={persist}>
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function ReminderSettingsBlock() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["reminder-settings"], queryFn: () => getReminderSettings() });
  const save = useServerFn(saveReminderSettings);
  const [enabled, setEnabled] = useState(true);
  const [offsetDays, setOffsetDays] = useState(1);
  const [time, setTime] = useState("12:00");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loaded || !settings.data) return;
    setEnabled(settings.data.enabled);
    setOffsetDays(settings.data.offsetDays);
    setTime(settings.data.time);
    setLoaded(true);
  }, [loaded, settings.data]);

  async function persist() {
    setBusy(true);
    try {
      await save({ data: { enabled, offsetDays, time } });
      await queryClient.invalidateQueries({ queryKey: ["reminder-settings"] });
      toast.success("Reminder time saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this setting.");
    } finally {
      setBusy(false);
    }
  }

  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="text-xl font-bold uppercase tracking-wide">Missing score reminders</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Automatically email both teams of every match that still has no submitted score. Each
        match is reminded once. Swedish time.
      </p>
      <label className="mt-4 flex max-w-2xl items-center justify-between gap-4 rounded border border-border bg-secondary/30 p-3">
        <span>
          <span className="block font-semibold">Send reminders automatically</span>
          <span className="block text-xs text-muted-foreground">
            Turn this off to send reminders by hand from Match scores.
          </span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>
      <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Day</span>
          <select
            className={`${control} w-full`}
            value={offsetDays}
            disabled={!enabled}
            onChange={(event) => setOffsetDays(Number(event.target.value))}
          >
            {DAY_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>{choice.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Time</span>
          <select
            className={`${control} w-full`}
            value={time}
            disabled={!enabled}
            onChange={(event) => setTime(event.target.value)}
          >
            {hours.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-sm">
        {settings.data?.nextRun ? (
          <>
            <span className="font-semibold">Next reminder:</span>{" "}
            <span className="tabnum">{settings.data.nextRun}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Automatic reminders are switched off.</span>
        )}
      </p>
      <button className={`${btn} mt-4`} disabled={busy} onClick={persist}>
        {busy ? "Saving…" : "Save reminders"}
      </button>
    </div>
  );
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function WeeklyWindowBlock() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["score-unlock"], queryFn: () => getScoreUnlockSettings() });
  const save = useServerFn(saveWeeklyScoreWindow);
  const [form, setForm] = useState({ enabled: false, unlockDay: 1, unlockTime: "19:00", lockDay: 3, lockTime: "10:00" });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loaded || !settings.data) return;
    setForm(settings.data.weekly);
    setLoaded(true);
  }, [loaded, settings.data]);

  async function persist() {
    setBusy(true);
    try {
      await save({ data: form });
      await queryClient.invalidateQueries({ queryKey: ["score-unlock"] });
      await queryClient.invalidateQueries({ queryKey: ["tournament"] });
      toast.success(form.enabled ? "Weekly lock and unlock saved." : "Weekly schedule switched off.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this setting.");
    } finally {
      setBusy(false);
    }
  }

  const label = "block text-xs font-semibold uppercase tracking-widest text-muted-foreground";
  const dayPicker = (value: number, onChange: (v: number) => void) => (
    <select className={`${control} w-full`} value={value} disabled={!form.enabled} onChange={(e) => onChange(Number(e.target.value))}>
      {WEEKDAYS.map((d, i) => (
        <option key={d} value={i + 1}>
          {d}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="text-xl font-bold uppercase tracking-wide">Weekly score submission lock &amp; unlock</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Open &quot;Submit Your Score&quot; and close it again at the same times every week (Swedish time). While this is on,
        it decides on its own — the manual switch and the one-time unlock below are ignored.
      </p>

      <label className="mt-4 flex max-w-2xl items-center justify-between gap-4 rounded border border-border bg-secondary/30 p-3">
        <span>
          <span className="block font-semibold">Repeat every week</span>
          <span className="block text-xs text-muted-foreground">Turn off to go back to the manual switch.</span>
        </span>
        <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
      </label>

      <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded border border-border p-3">
          <span className="block font-semibold text-primary">Unlock</span>
          <span className={label}>Day</span>
          {dayPicker(form.unlockDay, (v) => setForm({ ...form, unlockDay: v }))}
          <span className={label}>Time</span>
          <input type="time" className={`${control} w-full`} value={form.unlockTime} disabled={!form.enabled}
            onChange={(e) => setForm({ ...form, unlockTime: e.target.value })} />
        </div>
        <div className="space-y-2 rounded border border-border p-3">
          <span className="block font-semibold text-destructive">Lock</span>
          <span className={label}>Day</span>
          {dayPicker(form.lockDay, (v) => setForm({ ...form, lockDay: v }))}
          <span className={label}>Time</span>
          <input type="time" className={`${control} w-full`} value={form.lockTime} disabled={!form.enabled}
            onChange={(e) => setForm({ ...form, lockTime: e.target.value })} />
        </div>
      </div>

      {settings.data?.weekly.enabled ? (
        <p className="mt-3 text-sm">
          Every week: open {WEEKDAYS[settings.data.weekly.unlockDay - 1]} {settings.data.weekly.unlockTime}, locked{" "}
          {WEEKDAYS[settings.data.weekly.lockDay - 1]} {settings.data.weekly.lockTime}.{" "}
          <span className="font-semibold">{settings.data.open ? "Open now." : "Locked now."}</span>
        </p>
      ) : null}

      <button className={`${btn} mt-4`} disabled={busy} onClick={persist}>
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

const HOMEPAGE_CHOICES: { value: Homepage; label: string }[] = [
  { value: "standings", label: "Standings" },
  { value: "photos", label: "Photos (Champions & Gallery)" },
  { value: "schedule", label: "Schedule" },
  { value: "register", label: "Registration" },
  { value: "one-day", label: "One-day tournament" },
];

function HomepageBlock() {
  const queryClient = useQueryClient();
  const memories = useQuery(memoriesQueryOptions);
  const save = useServerFn(setHomepage);
  const [value, setValue] = useState<Homepage>("standings");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (memories.data) setValue(memories.data.homepage);
  }, [memories.data]);

  async function persist() {
    setBusy(true);
    try {
      await save({ data: { homepage: value } });
      await queryClient.invalidateQueries({ queryKey: ["memories"] });
      toast.success("Homepage saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the homepage.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="text-lg font-bold tracking-tight">Homepage</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose what visitors see when they open motionsserien.se. Every page stays in the menu.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          className={control}
          value={value}
          disabled={!memories.data || busy}
          onChange={(e) => setValue(e.target.value as Homepage)}
          aria-label="Homepage"
        >
          {HOMEPAGE_CHOICES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button type="button" className={btn} disabled={!memories.data || busy} onClick={persist}>
          {busy ? "Saving…" : "Save homepage"}
        </button>
      </div>
    </div>
  );
}
