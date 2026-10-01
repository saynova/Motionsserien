import { CalendarDays, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getRemaining(target: number, now: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

const UNITS: Array<{ key: keyof CountdownParts; label: string }> = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
];

export function TournamentCountdown({ startsAt }: { startsAt: string | null }) {
  const target = useMemo(() => (startsAt ? new Date(startsAt).getTime() : Number.NaN), [startsAt]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (!startsAt || Number.isNaN(target) || now === null) return null;

  const hasStarted = now >= target;
  const remaining = getRemaining(target, now);
  const formattedStart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Stockholm",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));

  return (
    <section className="relative overflow-hidden rounded-xl border border-primary/25 bg-primary px-4 py-5 text-primary-foreground shadow-lg sm:px-7 sm:py-6">
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-md">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-foreground/80">
            <Timer className="size-4" aria-hidden="true" />
            {hasStarted ? "Tournament day" : "Tournament starts in"}
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            {hasStarted ? "The tournament has started" : "The court is calling"}
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-primary-foreground/80">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            {formattedStart} · Swedish time
          </p>
        </div>

        {!hasStarted && (
          <div className="grid grid-cols-4 gap-2" aria-label={`Time remaining until ${formattedStart}`}>
            {UNITS.map(({ key, label }) => (
              <div
                key={key}
                className="min-w-0 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-2 py-3 text-center backdrop-blur-sm sm:min-w-20 sm:px-4"
              >
                <span className="tabnum block font-display text-2xl font-bold leading-none sm:text-3xl">
                  {String(remaining[key]).padStart(2, "0")}
                </span>
                <span className="mt-1.5 block text-[10px] font-bold uppercase text-primary-foreground/70 sm:text-xs">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}