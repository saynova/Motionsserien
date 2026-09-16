# Email reminders for missing results

Add player contacts from your sheet and let you email a reminder from the Admin page whenever a match has no result yet.

## What you get

**Player contacts**
- All 30 teams get their two players (name + email) loaded from your sheet. Team names match the ones already in the app (Kir, Punjab Power, Side by Side matched after trimming spaces).
- A small "Team contacts" section in Admin lets you fix an email or a name later without re-uploading anything.

**Reminder buttons in Admin**
- Every match still waiting for a result shows a "Remind" button. One click emails both players of both teams in that match.
- A "Remind all missing results" button at the top of the week sends one reminder per waiting match.
- After sending, the match shows when the last reminder went out, so nobody gets spammed by accident.

**The email**
- Subject and text name the week, division, the two teams, and the court/time, with a direct link to the score submission page.
- Sent from your own domain so it lands in inboxes and looks official.

## One thing needed from you

Emails can only be sent from a domain you own. You already have motionsserien.se, so we set it up as the sender (for example results@motionsserien.se). This is a one-time step with a couple of settings at your domain provider; after that sending works everywhere.

<presentation-actions>
<presentation-open-email-setup>Set up email domain</presentation-open-email-setup>
</presentation-actions>

## Technical notes

- Migration: `team_players` (team_id FK, player_no, name, email, unique per team+player_no) with RLS — public read of name only via a view is unnecessary, so keep reads server-side; grants for `authenticated`/`service_role`, server writes via service role. Add `last_reminder_at` to `matches`.
- Seed all 60 player rows as literal INSERTs in the same migration, joined to teams by trimmed name.
- Email domain, then `scaffold_transactional_email_templates`; new template `src/lib/email-templates/result-reminder.tsx` (props: week, division, teams, court, time, submit URL) registered in the registry.
- New admin server fns in `src/lib/extras.functions.ts` (or a new `reminders.functions.ts`), gated by `requireAdmin`: `getTeamPlayers`, `saveTeamPlayer`, `sendResultReminder({ matchId })`, `sendAllResultReminders({ weekNo })`. Each send loops per recipient with an idempotency key of `reminder-${matchId}-${email}-${date}`; treat `recipient_suppressed` as a skip and report counts back.
- Admin UI: reminder buttons on scheduled matches in `src/routes/admin.tsx`, plus a collapsible contacts editor; toast reports sent/skipped counts.
