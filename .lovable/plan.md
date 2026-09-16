# Fix winner logic, weekly movement, and Week 3 schedule

## The rules to apply

- A set is won by the team with the higher score (first two sets to 21, deciding set to 11).
- A third set is played only when the first two sets are split 1–1; the match winner is the team winning 2 sets.
- Movement inside a division of three: 2 wins → up one division, 1 win → stay, 0 wins → down one division (Div 1 cannot go up, Div 10 cannot go down).
- When teams are level on wins (for example all three on one win each, or two teams on zero wins after a walkover), the order is decided by **total points scored across all sets that week** — highest goes up, middle stays, lowest goes down.
- The winner of each finished match is shown right next to the scores.
- Every team that moves must appear in its new division in the next week's schedule and standings — a team relegated from Div 1 plays in Div 2 next week, a team promoted from Div 5 plays in Div 4, and so on for all divisions.

## What I found

The movement rule currently breaks ties on sets won before total points, so two divisions in Week 2 produced the wrong promotions, and Week 3 was generated from them:

- Division 9: Pumpa Gubbe (69 points) and Peboi (42 points) both won one match. Peboi was promoted; by total points Pumpa Gubbe should go up and Peboi stay.
- Division 10: Sokiyans (70 points) and Örnbjörn (42 points) both won one match. Örnbjörn was promoted; by total points Sokiyans should go up and Örnbjörn stay.

Everything else in Week 2 (Divisions 1–8 movement) already matches the rules above.

## What gets fixed

1. **Ranking order** changed to: matches won, then total points scored, then set difference, then point difference — so the tie rule you described decides who moves.
2. **Winner shown on every finished match** — the winning team is displayed immediately after the set scores on the standings page, the schedule page and the score submission confirmation, including "no result" for a 0–0 walkover.
3. **Week 3 rebuilt** from the corrected Week 2 results. No scores have been entered for Week 3 yet, so nothing is lost. Corrected Week 3 divisions:
   - Div 8: Desi divas, Lilla Grid, Pumpa Gubbe
   - Div 9: Punjab Power, Peboi, Sokiyans
   - Div 10: Madbinton, Örnbjörn, Fjäderfäna
   - Divisions 1–7 stay exactly as they are now.
4. **A "rebuild this week's schedule from last week's results" button** in the admin area, so if a past score is corrected the upcoming week can be regenerated without touching the database by hand.

## Technical notes

- `computeStandings` in `src/lib/tournament.ts`: reorder the comparator to `matchWins → pointsFor → setDiff → pointDiff → tieBreakAdj → position`. `buildNextAssignment` and `matchWinnerId` stay as they are (winner already derived from sets won).
- Winner rendering added to `src/components/tournament-ui.tsx` (`ScoreCell` / match rows), reused by `src/routes/index.tsx`, `src/routes/schedule.tsx` and `src/routes/submit.tsx`.
- Week 3 correction: one migration that deletes Week 3 `week_slots` and `matches` for the active season and reinserts them from the corrected standings, keeping the existing court/time rules (Div 1–5 at 19:00/19:20/19:40 on courts 1–5, Div 6–10 at 20:00/20:20/20:40).
- New admin server function `regenerateCurrentWeek` in `src/lib/tournament.functions.ts` reusing `writeWeek`, guarded so it refuses when any match in the current week already has a submitted or final score.
- Verify with a typecheck plus a Week 2/Week 3 standings check against the numbers above.
