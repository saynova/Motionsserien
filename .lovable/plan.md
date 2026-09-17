# Bulk approval, duplicate score lock, admin menu

## 1. Bulk approval by selection (admin)
- Each match in the week list gets a checkbox (only for matches waiting for approval).
- A bar above the divisions shows "X selected", with "Approve selected" and "Select all waiting" / "Clear".
- The existing "Approve all pending" button stays as the one-click shortcut.

## 2. Lock a match after a score is submitted (player)
- Once a result is reported for a match, no one can send another one.
- Attempting it shows exactly:
  "This match score has already been submitted and is awaiting approval. If you need to make changes, please contact the General through contact form from this website only"
- On the submit page, matches already reported no longer appear as choosable options; a short note explains they are awaiting approval and links to the contact form.
- The rule is enforced on the server too, so it cannot be bypassed.

## 3. Admin menu bar after sign-in
- After a successful sign-in, a sticky menu appears at the top of the admin page with links to every admin section: Weekly banner, Shuttles, Support, Questions, Send email, Team contacts, Season, Matches.
- Clicking a link jumps to that section. The menu is hidden on the sign-in screen.

## Technical notes
- `submitScore` in `src/lib/tournament.functions.ts`: reject when `status === "pending"` with the exact warning text; keep the final-match guard.
- `src/routes/submit.tsx`: filter the match list to `status === "scheduled"`, list awaiting-approval matches read-only with a `/ask` link.
- `src/routes/admin.tsx`: selection state (`Set<string>`) in `AdminConsole`, passed to `DivisionGroup`/`MatchCard`; "Approve selected" calls the existing `approveMatches` server fn.
- Admin section nav: anchor ids on each admin card wrapper + a sticky nav rendered only inside `AdminConsole`.
