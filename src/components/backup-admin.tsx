import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  downloadBackupNow,
  getBackupSettings,
  saveBackupSettings,
  sendBackupNow,
} from "@/lib/backup.functions";

const control = "rounded border border-input bg-card px-3 py-2 text-sm font-medium";
const btn =
  "rounded bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40";
const btnGhost =
  "rounded border border-border px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors hover:bg-secondary disabled:opacity-40";

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

export function BackupAdmin() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["backup-settings"],
    queryFn: () => getBackupSettings(),
  });
  const save = useServerFn(saveBackupSettings);
  const sendNow = useServerFn(sendBackupNow);
  const downloadNow = useServerFn(downloadBackupNow);

  const [enabled, setEnabled] = useState(true);
  const [offsetDays, setOffsetDays] = useState(0);
  const [time, setTime] = useState("22:30");
  const [email, setEmail] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (loaded || !settings.data) return;
    setEnabled(settings.data.enabled);
    setOffsetDays(settings.data.offsetDays);
    setTime(settings.data.time);
    setEmail(settings.data.email);
    setLoaded(true);
  }, [loaded, settings.data]);

  async function persist() {
    setBusy(true);
    try {
      await save({ data: { enabled, offsetDays, time, email } });
      await queryClient.invalidateQueries({ queryKey: ["backup-settings"] });
      toast.success("Backup settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this setting.");
    } finally {
      setBusy(false);
    }
  }

  async function testSend() {
    setSending(true);
    try {
      const result = await sendNow({ data: undefined });
      toast.success(
        result.ran ? `Backup emailed to ${result.sentTo}.` : (result.reason ?? "Nothing to send."),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the backup.");
    } finally {
      setSending(false);
    }
  }

  async function download() {
    setDownloading(true);
    try {
      const file = await downloadNow({ data: undefined });
      const bytes = Uint8Array.from(atob(file.base64), (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the backup.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6">
      <h2 className="text-2xl font-bold uppercase tracking-wide">Automatic backup</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        A PDF with the standings, every match result and the next week&apos;s courts and times is
        emailed to you automatically. Keep it on your phone so a Monday evening can run even if the
        website is unavailable. All times are Swedish time.
      </p>

      <label className="mt-4 flex max-w-2xl items-center justify-between gap-4 rounded border border-border bg-secondary/30 p-3">
        <span>
          <span className="block font-semibold">Email me a backup every week</span>
          <span className="block text-xs text-muted-foreground">
            Turn this off to stop the automatic backup emails.
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
        <label className="space-y-1 sm:col-span-2">
          <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Send the backup to
          </span>
          <input
            type="email"
            className={`${control} w-full`}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <p className="mt-3 text-sm">
        {settings.data?.nextRun ? (
          <>
            <span className="font-semibold">Next backup:</span>{" "}
            <span className="tabnum">{settings.data.nextRun}</span> (week{" "}
            {settings.data.currentWeek})
          </>
        ) : (
          <span className="text-muted-foreground">
            Automatic backup is switched off — you can still download the PDF below any time.
          </span>
        )}
      </p>
      {settings.data?.lastSent ? (
        <p className="text-sm text-muted-foreground">Last backup sent: {settings.data.lastSent}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button className={btn} disabled={busy} onClick={persist}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button className={btnGhost} disabled={downloading} onClick={download}>
          {downloading ? "Building…" : "Download PDF now"}
        </button>
        <button className={btnGhost} disabled={sending} onClick={testSend}>
          {sending ? "Sending…" : "Send backup email now"}
        </button>
      </div>
    </section>
  );
}
