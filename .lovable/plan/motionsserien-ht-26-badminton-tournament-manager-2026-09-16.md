# Motionsserien HT-26 — Badminton Tournament Manager

A shared online site for the recurring Monday badminton ladder: 30 teams, 10 divisions of 3, 10 weeks per season, with player score submission and admin approval.

## What gets built

### Standings (home page)
Live ladder for the active week — all 10 divisions, 3 teams each, showing match wins, sets won/lost, set difference, points for/against, point difference, rank, and an arrow indicator for each team: moving up, staying, or moving down. Division 1 first place and Division 10 last place show "stays" instead.

### Schedule & court planner
Week picker (Week 1–10), plus filters for court, division, and a team name search. Each division block shows its three round-robin matches with court and start time:
- Divisions 1–5: 19:00 / 19:20 / 19:40 on courts 1–5 respectively
- Divisions 6–10: 20:00 / 20:20 / 20:40 on courts 1–5 respectively

Every match shows its state: scheduled, awaiting approval, or final with the score.

### Score submission
Anyone with the link can submit. Pick week, division, then match; enter Set 1 and Set 2 as two numbers each. Set 3 unlocks only when the first two sets are split 1–1, and is capped at 11 points. Team A is the first-listed team. Submitted scores land as pending and do not affect standings until approved.

Validation: winner of a set must reach 21 (11 in set 3), no ties, sensible margins.

### Admin
Password-protected admin area:
- List of all pending submissions with "Approve all pending"
- Approve or reject individually
- Edit any match score, including already-final ones
- Mark a match 0–0 for a no-show (a team that never submits a score gets 0–0)
- "Finalise week & generate next week" — recomputes standings, applies promotion/relegation, and creates next week's schedule with the new divisions
- "Start new season" once Week 10 is final: teams are seeded into the new season from their final divisions

### Historical progress
Table of all 30 teams with their division and rank for each played week, mirroring the Excel Progress sheet, so movement up and down the ladder is visible across the whole season.

## Rules implemented

- Match: best of 3. Sets 1 and 2 to 21; set 3 only if 1–1, to 11.
- Division ranking: match wins, then set difference, then point difference, then points for, then a manual tie-break adjustment the admin can set.
- Promotion: rank 1 up one division (Div 1 stays), rank 2 stays, rank 3 down one division (Div 10 stays).
- No-show: 0–0, counts as a loss with zero points.

## Seed data loaded from the spreadsheet

- All 30 teams with their starting divisions and overall ranks (May Day through Fjäderfäna).
- Season "Motionsserien HT-26", starting Monday 2026-09-07, weekly on Mondays.
- Week 1: all 30 matches with the exact scores from the sheet, marked final. The Division 9 match Madbinton vs Örnbjörn had no score submitted, so it loads as 0–0.
- Week 2: the schedule exactly as in the sheet (Div 1: Kerala Blasters, May Day, Reunion, etc.), pending scores.
- Week 1 and Week 2 division/rank rows in the progress history.

## Technical notes

- Lovable Cloud backend: tables for seasons, teams, weeks (with per-week division assignment), matches, and score submissions. Public read access; writes to submissions open to anyone; approval and schedule generation restricted to admin.
- Admin access via a single shared admin password stored as a backend secret and verified server-side — no per-player accounts, matching "anyone with the link can submit".
- Standings, promotion/relegation and next-week generation run server-side so every visitor sees identical results.
- Seed data (teams, Week 1 scores, Week 2 schedule, progress) inserted via a database migration.
- Visual direction: dark court-side look, high-contrast ladder tables, Swedish club feel — no generic purple gradients.

## Questions I still need answered

None — I'll pick the admin password and show it to you once, and you can change it later.
