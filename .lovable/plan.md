# Next-season methodology: registration, seeding, manual adjustment

Today the admin page starts a new season straight from the last week's final standings — every team carries over, and there is no way to register a new team or move a strong newcomer into a high division. This plan adds a registration round and a seeding board you control before the season goes live.

## How it will work

1. **Open registration.** You open registration for the next season from the admin page. A public page lets a team sign up with: team name, both players' names and emails, phone (optional), whether they played last season, and their previous rank/division if any. They can also add a short note ("we played in another league at this level").
2. **Review the list.** Admin sees all registrations with status Pending / Accepted / Waitlisted. You accept teams until 30 are confirmed; extras stay on a waitlist you can promote at any time.
3. **Auto-suggested seeding.** Once 30 teams are accepted, the app proposes the starting divisions:
   - Returning teams get the division their final rank earned last season (winner up, third down, as now).
   - Teams that left the series leave gaps; you pick which accepted team fills each gap.
   - New teams are proposed at the bottom, filling remaining places from Div 10 upward.
4. **Manual adjustment.** A seeding board shows Div 1–10 with 3 slots each. You can move any team to any slot (swap with whoever is there) — so a strong newcomer goes straight into a high division. The board flags problems: a division with the wrong number of teams, a team placed twice, or an unassigned team.
5. **Lock and launch.** "Lock seeding & start season" creates the new season, saves the Week 1 divisions exactly as you arranged them, and generates the Week 1 schedule with the existing court/time rules. Nothing goes live until you press this.
6. **Contacts carried over.** Player names and emails from the registrations become the team contact list for the new season, so score reminders and announcements have current addresses.

Registration stays open-but-closable; when closed, the public page shows "Registration is closed" instead of the form.

## Rules kept unchanged

Promotion/relegation, 3-team divisions, scoring, tie-breakers, weekly courts and times, standings and progress views all stay exactly as they are. This only changes how a *new* season is seeded.

## Technical outline

- **Migration** — `registrations` (season label, team name, player1/2 name + email, phone, returning flag, previous division, note, status pending/accepted/waitlisted/rejected, timestamps) with public insert allowed, reads/updates server-side only; `registration_settings` (or a flag on `seasons`) for open/closed; `season_seeds` (target season label, team name or team_id, division, position) to hold the draft board before launch; `team_players` (team_id, player_no, name, email, unique per team+player_no) populated on lock.
- **Server functions** — public: `submitRegistration` (zod-validated, duplicate team-name check), `getRegistrationStatus`. Admin (`requireAdmin`): `listRegistrations`, `setRegistrationStatus`, `buildSeedSuggestion` (reuses `computeStandings` + `buildNextAssignment` from `src/lib/tournament.ts`, then places new teams from the bottom), `saveSeedBoard`, `lockSeedingAndStartSeason` (replaces the current unconditional `startNewSeason` path: creates teams that don't exist yet, writes Week 1 `week_slots` from the board, generates Week 1 matches, deactivates the old season, seeds `team_players`).
- **UI** — new public route `src/routes/register.tsx` (form + closed state, linked in nav); admin page gains a "Next season" section: registration toggle, registration table with accept/waitlist actions, and the 10×3 seeding board with move/swap plus validation warnings, ending in "Lock seeding & start season".
- The existing `startNewSeason` stays available as a fallback for a straight carry-over season with no roster changes.
