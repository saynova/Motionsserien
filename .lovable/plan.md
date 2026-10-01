# One-day tournament: registration

A new section on motionsserien.se for a separate one-day badminton event. The current series stays exactly as it is.

## Public page (/one-day)
- Event info at the top: event name, date, venue, and fee and Swish details. You set all of these in admin. Anything you leave empty stays hidden.
- Registration form, no sign-in needed: team name, Player 1 name, Player 2 name, email, phone, plus the required Terms checkbox.
- After you submit, the page says: "Thanks — your registration is waiting for approval."
- "Approved teams" list showing team name and both player names only. Emails and phone numbers are never shown.
- When registration is closed, the page says "Registration is closed" instead of showing the form.
- A link in the site menu, which shows only while the event is switched on.

## Page design
A professional event page with its own look, separate from the weekly series pages but using the site's fonts and colours:
- **Top banner:** the event name, plus clear blocks for date, venue and fee, and a "Register your team" button.
- **Countdown** to the event day, plus a live count of approved teams.
- **Registration card** with a clean two-column form, clear field labels and friendly error messages.
- **Approved teams** shown as tidy cards, not a plain table.
- Works well on phones.

## Admin: one "One day tournament" section
Every control for this event lives under a single **One day tournament** entry in the admin menu, kept apart from the current tournament's sections. It has tabs:
- **Event settings:** show the event (on/off), registration open/closed, name, date, venue, and fee and Swish text.
- **Registrations:** Pending, Approved and Rejected filters, with Approve, Reject and Delete on each row and team count totals.
- Later tabs for **Divisions**, **Schedule** and **Scores** will be added here in step 2.

New one-day registrations show a badge on this menu entry. They don't go into the current tournament's Notifications list.

## Protection
- The same team name can't be registered twice for this event, checked without regard to upper and lower case.
- Each field has a length limit, and the email address must be valid.

## Divisions, schedule and scoreboard (step 2, later)
This step only builds registration. The event-day part comes once you've chosen the format. So far you've decided:
- **Divisions:** you place approved teams into divisions or groups by hand, choosing how many divisions and how many teams go in each.
- **Scores:** players submit their result from a public page with no sign-in. You approve it in admin, and only approved results count.
- **Scoreboard:** a public page shows each division's table and results, and updates as you approve scores.

Still open, to decide before step 2:
- **Format:** round-robin divisions only, groups then knockout, or knockout only.
- **Scoring:** best of 3 sets, one set, or a timed match.
- **Planning:** the number of courts, the start time and match length, so the app can build a court and time schedule.

Step 2 will be planned separately once these are answered, so nothing is built on guesses.

## How it stays separate from the current tournament
- **Own storage.** One-day registrations and settings are kept apart from the current series. They never touch its teams, registrations, standings, schedule, payments, receipts or player accounts.
- **Own page and admin section.** The new page and admin area only read and change one-day data. Nothing in the current series pages, scores, reminders, automatic updates or backups will see these teams.
- **No automatic emails or reminders.** Score reminders, payment reminders, "email all teams" and weekly backups keep using only the current series' teams.
- **Turned off by default.** Nothing appears publicly until you switch the event on, and you can switch it off at any time.
- **Same team name allowed.** A team can use the same name in both events without a clash.
- **Nothing existing is edited.** The only small changes to existing parts are one menu link and one admin menu entry.

## Technical details
- Migration:
  - A `oneday_settings` table (single row): visible, is_open, name, event_date, venue, payment_details. It gets public read.
  - A `oneday_registrations` table: team_name, player1_name, player2_name, email, phone, status (pending/approved/rejected), with timestamps and a unique lower(team_name).
  - Both tables get grants plus row-level security. The public can't read either table directly, and all writes go through server functions.
- Server functions in `src/lib/oneday.functions.ts`:
  - Public, validated with zod: `getOnedayInfo`, `getOnedayApprovedTeams` (names only), `submitOnedayRegistration`.
  - Admin, using the existing admin session check: `listOnedayRegistrations`, `setOnedayStatus`, `deleteOnedayRegistration`, `updateOnedaySettings`.
- Routes and components:
  - New route `src/routes/one-day.tsx`, using a loader with `ensureQueryData` and its own `head()` metadata.
  - A new admin component and a menu entry in `admin.tsx`.
  - A conditional nav link in `__root`.
