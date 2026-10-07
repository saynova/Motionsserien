# Run all automatic checks every 10 minutes

## Goal
Every automatic feature in Admin → Automatic updates (score approval, schedule generation, missing-score reminders, weekly backup) is checked every 10 minutes instead of hourly, so a time the admin sets is honoured within ~10 minutes.

## Changes (database scheduler only — no app code changes)

Update the three existing cron jobs to `*/10 * * * *`:

1. **auto-finalize-week** — currently runs at :02 and :32 each hour → every 10 minutes. This drives automatic score approval and next-week schedule generation.
2. **score-reminders** — currently hourly → every 10 minutes. Drives missing-score reminder emails (still limited to one reminder per match per day, so no extra emails).
3. **weekly-backup** — currently hourly → every 10 minutes. Drives the weekly PDF backup email (still one backup per season week, so no duplicates).

Each check is cheap: when nothing is due, the job exits immediately after reading the season settings.

## Cost / timing trade-off

- 144 checks per job per day (432 total). Frequent checks keep the database active and can increase Cloud costs compared with the current hourly schedule.
- Benefit: any configured time (e.g. Wednesday 10:00) triggers within at most ~10 minutes instead of up to ~30–60 minutes.
- No emails, approvals, or backups happen more often than configured — the 10-minute cadence only shortens the delay before a due action runs.

## Verification

- Query the cron job list to confirm all three jobs show the 10-minute schedule.
- Confirm no app code changes are needed (the existing handlers already decide "due or not" on every call).
