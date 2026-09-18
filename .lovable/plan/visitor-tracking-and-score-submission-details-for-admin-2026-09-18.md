# Visitor tracking and score-submission details for admin

## 1. Visitor log (new admin section)

A new "Visitors" panel in the admin page shows recent visits, newest first:

- Date and time
- Page visited
- Approximate location (country/city, from the connection)
- Device type (phone, tablet, laptop), operating system and browser
- IP address
- Referrer (where they came from, e.g. Google or a link)

Extras: a summary at the top (visits today, visits this week, unique visitors), a page filter, and a "Delete logs older than 30 days" button.

Only admins can read this data; nothing is shown publicly.

## 2. Submitter details after each score

Each match card in "Match scores" gains a small "Submitted by" detail line under the score:

- Name typed by the submitter (already shown today)
- Date and time submitted
- IP address
- Device, operating system, browser
- Approximate location

This is recorded at the moment a score is submitted, so it stays visible after approval too.

## 3. Privacy note

The Terms & Conditions page gets one short line saying visit information (IP, device, browser, approximate location) is logged for security and fair-play checks, kept for a limited time, and visible only to the organiser.

## Technical notes

- New table `visit_logs` (path, ip, user_agent, device, os, browser, country, city, referrer, created_at) plus new columns on `matches`: `submitted_ip`, `submitted_user_agent`, `submitted_device`, `submitted_location`. RLS: no client access; reads go through admin-gated server functions; GRANTs for `service_role` only.
- A small server function `logVisit` called once per page view from the root route (fire-and-forget), reading `getRequest()` headers: `x-forwarded-for`, `user-agent`, `cf-ipcountry` / `cf-ipcity` where available, `referer`. User-agent parsed with a tiny local helper (no new dependency).
- `submitScore` in `src/lib/tournament.functions.ts` captures the same request metadata inside the handler and writes it with the score.
- Admin side: `listVisits` + `purgeOldVisits` in a new `src/lib/visitors.functions.ts` (gated with `requireAdmin`), `visitsQueryOptions` in `src/lib/tournament-query.ts`, a new `visitors` entry in `ADMIN_SECTIONS` in `src/routes/admin.tsx`, and the submitter detail line rendered in `MatchCard`.
- Bots/prefetch requests are skipped so the log stays readable.
