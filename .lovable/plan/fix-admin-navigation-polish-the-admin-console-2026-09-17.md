# Fix admin navigation + polish the admin console

## The problem

The admin menu links are plain page-jump links. Because the page has a sticky
header and a sticky section bar, and because several cards start collapsed,
jumping lands you above or below the card you picked — so "Shuttle purchases"
often shows something else entirely. The two side-by-side cards (banner /
shuttles) make it worse, since both share one jump target area.

## The fix: real sections instead of page jumps

Turn the admin console into a tabbed workspace. Picking a section shows that
section and hides the others, so the right panel is always exactly what you
clicked — no scrolling guesswork, no offset problems.

Sections:

1. Match scores (default) — week picker, approve all, finalise, match list
2. Weekly banner
3. Shuttle purchases
4. Donation & sponsor
5. Questions
6. Send email
7. Team contacts
8. Season settings
9. Weekly procedure
10. Registration & seeding
11. Start new season

The admin menu in the top bar keeps its entries; each one now opens the matching
section directly on the admin page (via a section value in the address, so links
and refreshes still land correctly).

## More professional look

- One clear console frame: page title row with season, current week, and quick
  counters (waiting scores, missing scores, questions unread).
- Section switcher as a proper tab strip: pill tabs, active tab in the indigo
  accent, a "waiting" number badge on Match scores and Questions when relevant.
- Consistent card styling for every panel: same glass surface, same heading
  size, same spacing — instead of today's mix of widths and paddings.
- Sign out and the week/finalise controls grouped in the header, not mixed into
  the section area.
- Mobile: tabs scroll horizontally in one row; panels go full width.

## Technical notes

- `src/routes/admin.tsx`: replace the anchor `nav` with a controlled tab list;
  store the active section in the route search param `section` (validated,
  defaults to `matches`) so header links and reloads work.
- `src/routes/__root.tsx`: admin menu items link to `/admin` with
  `search={{ section: id }}` instead of `href="/admin#id"`.
- Keep every existing editor component and server function unchanged — this is
  layout and navigation only.
- Verify with a signed-in browser pass at desktop and mobile widths: each tab
  renders its own panel, no horizontal overflow.
