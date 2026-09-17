# Show player names and buyer names on public lists

Two small display changes so names are visible publicly, as requested.

## 1. Registration page — show both player names
The public "Registered teams" list currently shows only team name and division.

- Update the registered-teams lookup (`getRegisteredTeams` in `src/lib/registration.functions.ts`) to also return `player1_name` and `player2_name` for approved teams. Email addresses and phone numbers stay private — only names are added.
- Update the table on `/register` to show a "Players" column with both player names next to the team name.

## 2. Shuttle purchases — show the buyer name
The public "Recent purchases" list currently shows team, boxes, and status only.

- Add `buyer_name` back to the public order columns in `src/lib/extras.functions.ts`.
- Add a "Buyer" column to the public list on `/shuttles` so the buyer's name is visible after approval.

## Verification
- `bunx tsgo --noEmit` passes.
- Browser check of `/register` and `/shuttles` at desktop and mobile sizes to confirm the new columns render and nothing overflows on small screens.

## Note
This partially re-opens two security-scan findings that were previously closed ("registrations_accepted_public_read" and "shuttle_orders_buyer_name_public_read"). Player names and buyer names will be publicly visible — emails, phone numbers, and all pending/rejected registrations stay private.
