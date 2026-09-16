# Seeding board: clearer warnings and easier manual adjustment

## What you are seeing now

The board is empty and the red box lists warnings because no teams have been accepted yet for the next season. The board only offers accepted teams to place, so every division shows "needs 3". The red box also cuts off after 8 lines, which is why it stops at Division 8 — Divisions 9 and 10 have the same warning, just hidden.

## What to change

1. **Show all warnings, grouped**
   - Replace the truncated list with a short summary line ("28 of 30 slots filled — 4 divisions still need teams") plus the full list, scrollable instead of cut off at 8.
   - When no teams are accepted yet, show one friendly line instead of ten warnings: "No accepted teams yet — accept teams above, then press Suggest divisions."

2. **Make each division card show its state**
   - Small counter per card: "3/3" in green, "1/3" in amber, so Divisions 9 and 10 are obvious at a glance.
   - Empty slots read "— pick a team —".

3. **Easier manual adjustment**
   - Keep the dropdown per slot (choosing a team that already sits elsewhere swaps the two, as it does today) and state this on screen: "Pick any team in a slot — if it is already placed elsewhere, the two teams swap."
   - Add small up/down arrows on each placed team to move it one division up or down (swapping with the team in the target slot), so fine-tuning does not require reading dropdowns.
   - Add a "Clear board" button next to Suggest divisions / Save board.

4. **Unplaced teams strip**
   - Above the grid, list accepted teams not yet on the board as chips, so you can see who is still waiting for a slot.

## Order of use (unchanged)

Open registration, accept 30 teams, press Suggest divisions, adjust manually, Save board, then Lock seeding & start season. The lock button stays disabled until the board is exactly 10 divisions x 3 teams.

## Shuttle purchase approval moves beside the banner editor

5. **Move the "Shuttle purchases" admin section so it sits on the right side of the "Weekly banner" editor at the top of the Admin page**
   - On wide screens: banner editor on the left, shuttle approval on the right, side by side. On narrow screens they stack (banner first, then shuttles).
   - The section keeps everything it has today — approve all pending, per-order Approve/Remove, and the approved total — just relocated; it is removed from its old spot further down the page.

## Technical notes

- Seeding changes are in `src/components/admin-next-season.tsx`; no database or server-function changes.
- Warning text still comes from `validateSeedBoard` in `src/lib/seeding.ts`; add a grouped count derived from `entries` rather than parsing strings.
- Up/down move reuses the existing `setSlot` swap logic.
- The banner/shuttle move is in `src/routes/admin.tsx`: wrap `BannerEditor` and `ShuttleAdmin` in a two-column grid (`lg:grid-cols-2`) and remove `ShuttleAdmin` from its current position.
- Verify with a typecheck and a browser pass at desktop and mobile widths.
