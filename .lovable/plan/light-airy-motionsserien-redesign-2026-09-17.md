# Light, airy Motionsserien redesign

## Goal
Refresh the full website into a bright professional tournament dashboard while preserving every existing feature, workflow, result, and admin control.

## Visual direction
- Replace the current dark courtside theme with a pure-white canvas and ultra-light slate section backgrounds.
- Use deep indigo as the primary action color, emerald for positive/active states, charcoal for headings, and slate for supporting text.
- Remove yellow from the website UI, including donation, weekly champion, sponsor, warning, and status treatments; use semantic indigo, emerald, red, and neutral alternatives.
- Switch to Space Grotesk for headings and DM Sans for body and data text.
- Use translucent white surfaces with `backdrop-filter: blur(16px)`, subtle dark borders, and restrained ambient shadows.
- Keep cards compact with modest corner radii and prioritize table readability over decoration.

## Site-wide structure
- Redesign the shared header as a clean, responsive navigation bar with a smaller non-yellow Donate action.
- Add a scannable dashboard introduction on the standings page with the Motionsserien HT-26 identity, the existing season context, and two clear actions: **Se Spelschema** and **Anmäl Lag**.
- Add live quick-stat pills derived from existing tournament data: 30 active teams, current week/round, and 10 divisions.
- Restyle the weekly champion, sponsor, contact, Terms notice, donation dialog, page headings, controls, tables, forms, dialogs, and status labels within one consistent system.
- Retain the footer Terms link and all current navigation destinations.

## Page coverage
Apply the new design consistently to:
- Standings and match summaries
- Schedule and court planner
- Team progress
- Shuttle purchases
- Team registration
- Contact / Ask the General
- Score submission
- Terms & Conditions
- Admin login and the full admin workspace, including collapsed editors and operational controls
- Not-found and error states

## Responsive and interaction quality
- Keep dense standings and progress tables scannable on desktop and safely scrollable or condensed on mobile.
- Ensure navigation, CTAs, stat pills, banners, dialogs, and admin controls never overlap or clip.
- Add restrained entrance and hover transitions, with reduced-motion fallbacks.
- Preserve accessible contrast, focus indicators, readable tap targets, and current form behavior.

## Technical details
- Rework semantic color, shadow, radius, and font tokens in the global design system; avoid hardcoded page-level colors.
- Load Space Grotesk and DM Sans from the existing document head pattern.
- Reuse existing Button and UI primitives for actions rather than introducing parallel controls.
- Do not change tournament calculations, backend data, permissions, email delivery, or admin workflows.
- Keep all leaf-page metadata intact and verify each content page still has complete unique metadata.

## Validation
- Check the key public pages and admin workspace at desktop and mobile widths.
- Verify all navigation, dialogs, forms, expanding sections, tables, and Donate/QR interactions still work.
- Confirm there is no horizontal page overflow, no unreadable text, no yellow UI styling, and no browser errors.
