# Fixed weekly timetable for automatic updates

## Goal
Stop checking every 10 minutes all day. Each automatic feature runs only in its own window (Swedish time), and the Automatic updates section shows this timetable.

## New timetable (Swedish time)

| Feature | When it checks |
|---|---|
| Score approval | Every day at 10:00, except Wednesday |
| Score approval (Wednesday) | Every 10 min from 10:00 to 11:00 |
| Next-week schedule update | Sunday, every hour |
| Missing-score reminder | Tuesday, every hour |
| Weekly backup | Wednesday, every hour |

Your own settings still decide what actually happens: for example, scores are only approved once their approval time has passed, a reminder goes out only at the hour you set, and there is still only one backup per week. The timetable only controls when the system checks.

Note: if a setting is outside its window (for example, schedule update set to Monday), it will run at the next window instead (the next Sunday). The admin page will show a warning when that happens.

Checks per day: about 1 on normal days, about 7 on Wednesday, plus 24 on Sunday, Tuesday and Wednesday. That is roughly 110 per week, down from about 3,000.

## Changes
1. **Split score approval from schedule update.** The automatic job gets a "stage" choice, so the daily and Wednesday checks only approve scores and Sunday checks only build the schedule. The schedule stage still approves any scores left over first, so the standings are correct.
2. **Time window check in the app.** Each check confirms it falls inside its Swedish-time window. This keeps the timetable correct when clocks change between summer and winter time.
3. **Replace the scheduler jobs:** remove the three 10-minute jobs and add five jobs matching the table.
4. **Admin, Automatic updates:** add a "When the system checks" card near the top, under the Homepage picker. It lists the timetable above and warns when a chosen time falls outside its window.

## Technical details
- `src/routes/api/public/cron/auto-finalize.ts` reads `stage: "approve" | "schedule"` from the request body. `autoFinalizeDueWeek(force, stage)` in `src/lib/auto-finalize.server.ts` limits work to that stage. The "schedule" stage still runs approval first.
- Stockholm-time gate helpers: approve-daily allows hour 10 on non-Wednesdays. Approve-Wednesday allows 10:00–11:00 on Wednesday. Schedule allows Sunday. Reminders allow Tuesday. Backup allows Wednesday.
- pg_cron (UTC, covers both CET and CEST, and the app gate filters the extra runs):
  - approve-daily `0 8,9 * * 0,1,2,4,5,6`, body `{"stage":"approve"}`
  - approve-wednesday `*/10 8,9 * * 3`, body `{"stage":"approve"}`
  - schedule-sunday `0 * * * 0` plus `0 22,23 * * 6` to cover Sunday in Stockholm, body `{"stage":"schedule"}`
  - score-reminders `0 * * * 2` plus `0 22,23 * * 1`
  - weekly-backup `0 * * * 3` plus `0 22,23 * * 2`
- New static timetable card in `src/components/auto-update-admin.tsx`, with out-of-window warnings based on the saved offset days and time.
