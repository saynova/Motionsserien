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
- Implicit email-link credentials are consumed by src/lib/auth-url-session.ts in the root and protected-route guards, with the URL hash cleared before session validation — avoids blocked-network redirect loops and exposed tokens.
