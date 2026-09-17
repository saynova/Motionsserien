# Simpler reply emails, a compose box, and the questions inbox

## 1. Reply emails start with just "Hi,"

The reply email currently prints "Motionsserien HT-26" as a big title above the greeting. That
title is removed, so the email opens directly with:

> Hi Anna,

(or just "Hi," when no name was given), then your text, your sign-off, the quoted original
question, and the small footer line at the very bottom.

## 2. Emails come from your own name and address

All emails the site sends (replies and score reminders) will show:

> Md Rabiul Islam &lt;rabiul@motionsserien.se&gt;

and answers from players land in that mailbox instead of a no-reply address.

## 3. New "Send an email" box in the admin console

A new card lets you write and send an email yourself, with three ways to choose who gets it:

- **A single player** — pick a division, then pick one player from the teams in it.
- **Everyone in a division** — all players of the three teams in that division. Each person
  gets their own separate copy, and you see how many were sent.
- **Any address** — type an email address by hand.

You write the subject and the message; it goes out from your address with the same clean
layout as the replies. A short note in the card reminds you this is for tournament matters
(reminders, schedule changes, answers) — the site is not set up for newsletters or
promotional mail, because that would harm delivery of the important emails.

## 4. Reading and replying to email

The questions inbox in the admin console stays your place to read and answer players: every
message from the Contact page appears there, and you reply straight from the site.

The site itself cannot receive email, so messages sent directly to
rabiul@motionsserien.se still arrive in your normal mailbox at your provider — those cannot
be shown on the website.

## Technical notes

- `src/lib/email-templates/message-reply.tsx`: drop the `Heading` title; keep greeting,
  body paragraphs, sign-off, quoted original, footer.
- `src/lib/email-templates/send-email.ts`: `SITE_NAME` → `Md Rabiul Islam`, from address
  `rabiul@${FROM_DOMAIN}`, and `reply_to` defaults to the same address. `SENDER_DOMAIN`
  stays `notify.motionsserien.se`.
- New template `src/lib/email-templates/general-email.tsx` (props `subject`, `bodyText`,
  optional `name`) registered in `registry.ts` as `general-email`, with the subject taken
  from `templateData`.
- New server functions in `src/lib/reminders.functions.ts`, all behind `requireAdmin`:
  `listDivisionPlayers` (current week's `week_slots` → teams → `team_players`, grouped by
  division) and `sendGeneralEmail` ({ mode: 'player' | 'division' | 'address', ... subject,
  body }) which resolves recipients server-side and sends one personalised email per
  recipient with idempotency key `general-<hash>-<email>-<date>`; returns sent/suppressed
  counts. No recipient list is ever accepted from the browser.
- New `src/components/compose-email-admin.tsx` rendered in `src/routes/admin.tsx` near the
  Team contacts card; new query option `divisionPlayersQueryOptions` in
  `src/lib/tournament-query.ts`.
- Verify with a typecheck and a desktop/mobile check of the admin console.
