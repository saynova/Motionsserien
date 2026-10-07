// Swedish-time windows in which each automatic check is allowed to run.
// The scheduler fires in UTC with extra runs to cover summer/winter time;
// these gates drop runs that fall outside the intended Stockholm window.

export type CronWindow = "approve" | "schedule" | "reminders" | "backup";

function stockholm(): { weekday: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Stockholm",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { weekday: days.indexOf(get("weekday")), hour: Number(get("hour")) % 24, minute: Number(get("minute")) };
}

export function inCronWindow(window: CronWindow): boolean {
  const { weekday, hour, minute } = stockholm();
  switch (window) {
    case "approve":
      // Wednesday: every 10 min 10:00–11:00. Other days: once at 10:00.
      if (weekday === 3) return hour === 10 || (hour === 11 && minute < 5);
      return hour === 10 && minute < 10;
    case "schedule":
      return weekday === 0;
    case "reminders":
      return weekday === 2;
    case "backup":
      return weekday === 3;
  }
}
