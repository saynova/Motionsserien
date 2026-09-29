import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { getAutoUpdateSettings, saveAutoUpdateSettings } from "@/lib/auto-update.functions";

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
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["auto-update-settings"],
    queryFn: () => getAutoUpdateSettings(),
  });
  const save = useServerFn(saveAutoUpdateSettings);

  const [enabled, setEnabled] = useState(true);
  const [offsetDays, setOffsetDays] = useState(7);
  const [time, setTime] = useState("11:00");
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
      await queryClient.invalidateQueries({ queryKey: ["auto-update-settings"] });
      toast.success("Automatic update time saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this setting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-2xl font-bold uppercase tracking-wide">Automatic updates</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Choose when the week closes by itself: submitted scores are approved, matches with no score
        become 0–0, promotion and relegation are applied and the next week&apos;s schedule is
        published. All times are Swedish time.
      </p>

      <label className="mt-4 flex max-w-2xl items-center justify-between gap-4 rounded border border-border bg-secondary/30 p-3">
        <span>
          <span className="block font-semibold">Update scores and schedule automatically</span>
          <span className="block text-xs text-muted-foreground">
            Turn this off to finalise every week by hand.
          </span>
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
        {settings.data?.nextRun ? (
          <>
            <span className="font-semibold">Next automatic update:</span>{" "}
            <span className="tabnum">{settings.data.nextRun}</span> (week{" "}
            {settings.data.currentWeek})
          </>
        ) : (
          <span className="text-muted-foreground">
            Automatic updates are switched off — finalise each week yourself under Match scores.
          </span>
        )}
      </p>

      <button className={`${btn} mt-4`} disabled={busy} onClick={persist}>
        {busy ? "Saving…" : "Save"}
      </button>
    </section>
  );
}
