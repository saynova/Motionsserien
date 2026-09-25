# Professional progress graph and team details

## What will change
- Replace the current week-by-week progress table with a polished interactive graph that plots each team's division position across the season.
- Add team selection and clear week markers, movement direction, tooltips, and a compact weekly record below the graph for mobile accessibility.
- Make every team name in Current Standings clickable.
- Open a responsive team details panel showing player names, current division/rank, season totals, recent form, and previous match results with scores and opponents.
- Keep private player information such as email addresses and phone numbers hidden.

## Technical details
- Extend the existing public tournament read with player names only and derive all performance history from approved match and weekly slot data already available.
- Build the chart with the existing Recharts library and semantic design tokens.
- Use the existing dialog components for team details, with keyboard and screen-reader support.
- Verify the Progress page and team-detail flow at desktop and mobile sizes, then check the current build diagnostics.
