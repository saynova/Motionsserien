# Finish the remaining standings-page ideas

Four items from the design brief were left out. This plan adds all four to the homepage standings (`src/routes/index.tsx`), plus the badge colors in `src/components/tournament-ui.tsx`.

## 1. Fold-away divisions on phones

Each division card gets a collapse toggle (chevron button next to the division title). On phones, divisions start folded — showing only the header (division name, session, court) — and tap to open. On larger screens they stay open by default. State lives in the existing per-division state pattern (`views`), so it costs nothing extra.

## 2. Swipe hint for wide tables

On phones, when a table can scroll sideways (e.g. the Match results view), show a small "swipe" hint with an animated arrow above the table. It fades out after the user scrolls the table once. Purely visual, no layout change.

## 3. Shuttlecock icons

Use a small shuttlecock-style accent icon next to each division title and in the empty states, replacing the plain text headers' plain look. Lucide has no shuttlecock, so a small inline SVG shuttlecock icon component will be added in `src/components/tournament-ui.tsx` and reused — kept subtle, primary-colored, same size as existing icons.

## 4. Softer blue for "Stays"

The "Stays" badge currently uses neutral grey (`text-hold border-border bg-muted/50`). Change the `stay` entry in `MovementBadge` to a soft pastel blue (a muted blue text on a light blue tint background), matching the pastel feel of the green "up" and red "down" badges. This badge is shared across pages, so the softer blue will appear everywhere the badge is used — consistent with the brief.

## Verification

- Typecheck passes.
- Open the homepage at desktop width: divisions open, shuttlecock icons visible, "Stays" badge soft blue.
- Open at phone width: divisions folded, tapping opens one; swipe hint appears over a wide table and disappears after scrolling.
