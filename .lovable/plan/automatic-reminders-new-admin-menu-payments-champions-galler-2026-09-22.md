# Automatic reminders, new admin menu, payments, Champions & Gallery

## 1. Automatic missing-score reminders

- Every Tuesday at 11:00 (Swedish time) the site checks the matches of the
  previous match day and, for each match with no result submitted, emails both
  players of both teams the same bilingual reminder you already send by hand.
- Teams with a result already in (submitted or approved) get nothing.
- Each match is reminded once per day, so nobody is emailed twice.
- The "Send reminder" button stays for manual use, and the admin list shows when
  the automatic reminder was last sent.

## 2. New admin menu

- The long row of section buttons is replaced by a clean header: page title,
  season and current week, and a hamburger (three-line) button in the top-right.
- Clicking it opens a side drawer listing every admin section, grouped:
  Weekly work (Match scores, Weekly procedure, Payments, Questions),
  Content (Weekly banner, Champions & Gallery, Donation & sponsor, Shuttles),
  Email (Send email, Email settings, Team contacts),
  Season (Season settings, Registration & seeding, Start new season, Visitors).
- The current section is highlighted; picking one closes the drawer and shows
  that panel. Links from elsewhere and page refreshes still land on the right
  section. Works the same on phone and laptop.

## 3. Team payments

- New **Payments** section listing all teams of the running season with a clear
  Paid / Unpaid (Due) status and a small note field per team.
- You switch a team to Paid (with the date recorded) or back to Unpaid.
- Counters at the top: how many paid, how many still due.
- **Send payment reminder** per team emails that team's registered players a
  bilingual payment reminder (English first, Swedish second, your closing
  sentence and signature, and the Swish details from the season settings).
- **Remind all unpaid** sends the same to every team still due, and each row
  shows when its reminder last went out.

## 4. Champions & Gallery ("Memories")

New public page `/memories`, reachable from the main menu:

1. **Champion Hall** at the top — prestigious trophy-style showcase. Past
   champions as cards by season/year with team photo, season title, team name
   and a trophy badge; the most recent winner gets a large featured card.
2. **Divider**, then **Match day photos** — masonry/grid gallery with hover
   lift, opening a full-screen lightbox for high-resolution viewing.
3. Clean sports-media styling in the site's existing glass/indigo look, smooth
   scrolling between the two sections.

Admin side (new **Champions & Gallery** section):

- Add / edit / remove champion entries: season title, year, team name, photo.
- Upload high-quality match photos with an optional caption, reorder and delete.

## 5. Homepage switch

- A **Tournament finished** switch in Season settings. While it is on, the
  homepage shows Champions & Gallery; standings stay reachable from the menu.
- Turning it off (or starting a new season) puts current standings back as the
  homepage.

## Technical notes

- New tables: `team_payments` (season_id, team_id, is_paid, paid_at, note,
  reminded_at), `champions` (season_title, year, team_name, photo_path,
  sort_order), `gallery_photos` (caption, image_path, sort_order), plus
  `season_finished` on `site_support_settings`. All with grants, RLS on,
  public read for champions/gallery, writes only through admin server functions
  using the existing `requireAdmin` session.
- New public storage bucket `gallery` for champion and match photos, uploaded
  through an admin server function.
- Reminder automation: server route `src/routes/api/public/cron/score-reminders`
  guarded by `authenticateCronRequest`, scheduled with pg_cron + pg_net at
  09:00 UTC Tuesdays; it reuses the existing reminder email path and logs into
  `score_reminders` for the once-per-day guard.
- New email templates `payment-reminder` (bilingual, uses the saved closing and
  signature) wired through `sendTemplateEmail`.
- `src/routes/admin.tsx`: keep all existing panels and server functions; swap
  the tab strip for a header + Sheet drawer driven by the same `section` search
  param, with the two new sections added.
- `src/routes/index.tsx` renders the Champions & Gallery view when the finished
  flag is on; `/memories` route always shows it, with its own head metadata.
