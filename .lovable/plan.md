# Keep Standings reachable when another page is the homepage

## Problem
When Photos is chosen as homepage, the home address shows Photos, and the "Standings" menu item still points to the home address — so Standings can no longer be opened.

## What will change
- Standings gets its own address: motionsserien.se/standings (always works, whatever the homepage is).
- The menu reorders itself based on the chosen homepage:
  - The chosen homepage moves to the first menu position and links to the home address.
  - Standings then appears right after it, pointing to /standings.
  - Example with Photos as homepage: Photos, Standings, Progress, Shuttles, Register, Contact, Admin.
  - With Standings as homepage (default): menu stays exactly as today.
- Same logic for Schedule, Registration and One-day choices: that page goes first, Standings second.
- The Photos page at /photos keeps working too.

## Technical details
- New route `src/routes/standings.tsx` rendering the existing `StandingsPage` + `WeeklyBanner` (export them from index or move to a shared component file), with its own head() metadata.
- `src/routes/index.tsx` HomePage: render Photos (MemoriesView) when `homepage === "photos"` (in addition to `seasonFinished`), standings otherwise; existing redirects for schedule/register/one-day remain.
- `src/routes/__root.tsx`: read `memoriesQueryOptions.homepage`; build NAV dynamically — if homepage ≠ standings, put the homepage item first, then `{ to: "/standings", label: "Standings" }`, and drop its duplicate; keep the one-day replacement of Register.
- Add /standings to the sitemap.
- Verify with Playwright: homepage picker set to Photos shows Photos first and Standings opens at /standings.
