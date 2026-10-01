# One-day tournament: registration

A new section on motionsserien.se for a separate one-day badminton event. The current series stays exactly as it is.

## Public page (/one-day)
- Event info at the top: event name, date, venue, and fee and Swish details. You set all of these in admin. Anything you leave empty stays hidden.
- Registration form, no sign-in needed: team name, Player 1 name, Player 2 name, email, phone, plus the required Terms checkbox.
- After you submit, the page says: "Thanks — your registration is waiting for approval."
- "Approved teams" list showing team name and both player names only. Emails and phone numbers are never shown.
- When registration is closed, the page says "Registration is closed" instead of showing the form.
- A link in the site menu, which shows only while the event is switched on.

## Admin (new "One-day tournament" section)
- Event settings: show the event (on/off), registration open/closed, name, date, venue, fee and Swish text.
- A list of all registrations, with filters for Pending, Approved and Rejected. Each row has Approve, Reject and Delete, and shows team count totals.
- New registrations also appear in admin Notifications.
- Divisions and matches are not part of this step. They will be added once registrations are in.

## Protection
- The same team name can't be registered twice for this event, checked without regard to upper and lower case.
- Each field has a length limit, and the email address must be valid.

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
