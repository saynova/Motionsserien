<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Rich-text admin emails: HTML from the editor is cleaned with src/lib/email-html.ts before sending and after translation — keeps unsafe content out of emails.
- Public team profiles derive performance from tournament snapshots and expose player names only, never contact details — keeps standings useful without leaking private data.

- Player accounts link to teams via account_links keyed by registration target season (seasons.registration_key); receipts are issued only through the claim_invoice DB function — enforces the 800 kr team cap atomically.

- Automatic week finalise lives in src/lib/auto-finalize.server.ts, called by the token-protected route src/routes/api/public/cron/auto-finalize.ts on a Monday-morning cron; it approves pending scores, records 0-0 no-shows and generates the next week at 11:00 Stockholm (8 h before the 19:00 games) — keeps the ladder moving when the admin is unavailable.

- All browser traffic to the backend stays same-origin: gallery images are proxied by src/routes/api/public/gallery/$.ts and every client Supabase call is rewritten to src/routes/api/public/sb/$.ts by src/integrations/supabase/same-origin.ts (imported in __root) — corporate networks block the backend subdomain while allowing motionsserien.se.
- Authentication callbacks are captured and sanitized by src/lib/auth-url-callback.ts before the backend client initializes, then completed by src/lib/auth-url-session.ts before browser-only protected-route checks — supports token and PKCE links without exposing credentials or causing redirect loops.

- Weekly PDF backup lives in src/lib/weekly-backup.server.ts (pdf-lib -> private `backups` bucket -> signed link in the `weekly-backup` email), scheduled by the hourly token-protected route src/routes/api/public/cron/weekly-backup.ts which checks seasons.backup_* and the weekly_backups log — one backup per season week, admin-configurable, survives the site being unavailable.
- One-day tournaments live in separate oneday_* tables, src/lib/oneday.functions.ts and one admin section — keeps them from touching the weekly series.
- The main tournament countdown is sourced from registration_settings.tournament_starts_at and interpreted in Europe/Stockholm — keeps the public timer aligned with the admin-entered Swedish start time.
- Gallery view analytics reuse gallery_photos.view_count through an admin-only server query in the Visitors dashboard — keeps media reporting private without duplicating tracking data.
- Guest partner requests use the existing private partner_requests table with a nullable account owner and a validated public submission function; pairing creates account links only for account owners — supports guests without exposing contacts or inventing accounts.
- Matched teams are created atomically through a service-role-only database function; per-player hashed invitation secrets authorize explicit POST confirmation and a database trigger prevents acceptance until both confirmations exist — prevents racing pairings, premature approval and email-scanner confirmation.
- Team-name edits use an admin-gated transactional function that updates registration, seeding and matching season teams together — keeps published names consistent without renaming historical receipts.
