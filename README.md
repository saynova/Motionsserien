# Shuttle Scheduler

Build a tournament management web application for the recurring badminton tournament "Motionsserien HT-26" using the provided Excel file (Badminton_Tournament_Score.xlsx) as the seed data and rules blueprint.

Key Specifications:
1. Tournament Structure:
   - 30 teams, 10 divisions (Divisions 1 to 10), 3 teams per division.
   - 10 weeks per season. When season ends (after Week 10), allow rolling into a new season automatically with teams seeded from their final finishing divisions.
   - Courts & Timings every Monday:
     - Divisions 1–5 play 19:00–20:00 (Court 1: Div 1, Court 2: Div 2, Court 3: Div 3, Court 4: Div 4, Court 5: Div 5) with matches at 19:00, 19:20, 19:40.
     - Divisions 6–10 play 20:00–21:00 (Court 1: Div 6, Court 2: Div 7, Court 3: Div 8, Court 4: Div 9, Court 5: Div 10) with matches at 20:00, 20:20, 20:40.

2. Promotion / Relegation & Division Ranking:
   - Within each division (3-match round robin):
     - Rank 1: Moves up 1 division (Div 1 stays in Div 1)
     - Rank 2: Stays in division
     - Rank 3: Moves down 1 division (Div 10 stays in Div 10)
   - Match Rules: Best of 3 sets. Set 1 to 21, Set 2 to 21. If split 1–1, Set 3 is played to 11 points only.
   - Division Ranking Tie-breakers: Match Wins > Set Difference > Point Difference > Points For > Tie-break adjustment.

3. Score Submission & Admin Approval:
   - Score submission modal/form for players: pick division/match, input Set 1 and Set 2 scores (and Set 3 up to 11 if tied), and submit.
   - Admin view with Bulk Approval ("Approve All Pending Scores") and per-match edits.
   - Automatic Next-Week Schedule Generator: Once a week's matches are finalized/approved, auto-calculate new division standings, apply promotion/relegation, and generate the schedule for the next week.

4. Views & Features:
   - Current Standings (live ladder for the active week with promotion/relegation indicators).
   - Weekly Schedule & Court planner (filtered by week, court, division, and team search).
   - Historical Progress tab (movement between divisions across weeks like in the Excel 'Progress' sheet).
   - Pre-populate all 30 teams and Week 1 completed scores and Week 2 schedule directly from the Excel sheet.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://motionsserien.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/739e6fd2-41ae-471b-b65f-18c814ffb768).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
