# Fix mobile standings overflow

## Goal
Keep the full standings table visible on narrow screens, including complete movement labels such as “Down to Div 2”.

## Changes
- Rework the standings table’s mobile spacing and column widths so it fits inside each division panel.
- Shorten secondary statistic headings on mobile while preserving their full meaning through labels/tooltips.
- Let long team names use the available space without forcing the movement badge off-screen.
- Keep the existing desktop table layout unchanged.

## Validation
- Check the standings at mobile width for horizontal overflow and clipped badges.
- Confirm all movement labels are fully visible and the desktop view remains intact.
