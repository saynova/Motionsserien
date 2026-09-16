# Payment note, score deadline, missing-score reminders, and replies from your own address

## 1. Shuttle purchase text

On the shuttle purchase page, under the order form, add a payment line:

> Please swish 135kr to 1234785069, Ludvika Badmintonklubb

Shown next to the existing delivery note so buyers see both before ordering.

## 2. Submit a score note

On the submit-a-score page, add under the form:

> You will have 2 days to submit the score. Any missing result will be treated as a no-show and given 0-0.

## 3. Email from your own domain (needed for 4 and 5)

Emails can only be sent from a domain you own, so `motionsserien.se` has to be set up
for sending first. I'll show you the setup panel; it takes a few DNS records at your
domain provider. Everything below is built either way, but emails only start going out
once the domain is verified.

## 4. Reminder button for missing results

In the admin console, each match still without a result gets a **Send reminder** button on
the right side of the row.

- Clicking it emails both players of both teams in that match.
- The email is bilingual: English first, then Swedish, with the week, division, court,
  time, opponents, a link to the submit page, and the 2-day / 0-0 rule.
- The button shows when a reminder was last sent for that match, so nobody gets spammed.
- Reminders need player email addresses. I'll add a **Team contacts** section in the admin
  console where you can add or edit two names and emails per team, and preload it from the
  player list you sent earlier if that file is still available.

## 5. Reply to contact messages from the website

In the admin message inbox, each expanded message gets a **Reply** box.

- You type the reply and send it; it goes out from your own domain to the person's address,
  with their original question quoted underneath.
- Sent replies are stored with the message so you can see what you already answered, and
  the message is marked as answered automatically.
- The existing "Reply by email" mailto button stays as a fallback.

## Technical notes

- Email domain via the email setup dialog, then scaffold the template registry and send
  helper; two new React Email templates (`missing-score-reminder`, `message-reply`) with
  English + Swedish sections.
- New `admin_reminders` table (match_id, sent_at, sent_to count) for the "last sent" state;
  `messages` gains `reply_body` and `replied_at`. Both with grants + RLS (service_role only,
  read through admin-gated server functions).
- New server functions in `src/lib/reminders.functions.ts` (`sendScoreReminder`,
  `listTeamContacts`, `saveTeamContacts`) and `replyToMessage` in `messages.functions.ts`,
  all behind `requireAdmin`; sends use idempotency keys derived from match/week.
- UI: reminder button in the match rows of `src/routes/admin.tsx`, contacts editor as a new
  component, reply box in `src/components/messages-admin.tsx`, static text in
  `src/routes/shuttles.tsx` and `src/routes/submit.tsx`.
