# Photos web address and homepage choice

## 1. "Memories" becomes "Photos" in the web address
- Clicking **Photos** in the menu opens `motionsserien.se/photos` instead of `/memories`.
- Old `/memories` links (Google, shared links) send visitors to `/photos` automatically, so nothing breaks.
- Page title and Google text use "Photos" wording; sitemap updated to `/photos`.

## 2. Admin chooses the homepage
In Admin → Champions & Gallery, the "Tournament finished" switch is replaced by a **Homepage** picker:
- Standings (default)
- Photos (Champions & Gallery)
- Schedule
- Registration
- One-day tournament

Saving it changes what visitors see at `motionsserien.se`. Each page also stays reachable from the menu. The current switch setting carries over (if it is on now, Photos is selected).

## Technical details
- Rename `src/routes/memories.tsx` to `src/routes/photos.tsx`; add `src/routes/memories.tsx` that redirects to `/photos`; update the nav link in `__root.tsx`, canonical/og URL and `public/sitemap.xml`.
- Migration: add `homepage text not null default 'standings'` with a check constraint to `site_support_settings`; backfill `'photos'` where `season_finished` is true.
- `getMemories` returns `homepage`; new admin-only `setHomepage` server function (same `requireAdmin` guard) replaces `setSeasonFinished` usage.
- `src/routes/index.tsx` renders the chosen page's existing view (standings, MemoriesView, schedule, register, one-day), loading that view's data in the loader. If a choice can't render cleanly inline, the homepage redirects to that page instead.
