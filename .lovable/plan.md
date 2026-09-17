# Terms & Conditions page + consent on forms

## What you'll see

### 1. New "Terms" page (`/terms`)
A clean, readable page in the site's existing style, covering four sections:

1. **Tournament & scoring rules** — fair play and honest score entry, the 2-day submission deadline, missing results count as no-show 0–0, walkovers, and that the organizer's (The General's) decisions on rankings, movement, and disputes are final.
2. **Shuttle purchases** — swish 135 kr to 1234785069 (Ludvika Badmintonklubb), maximum 1 shuttle box per team per two weeks, delivery every Monday 20:00 in the Rackethall, orders are binding once approved and not refundable after delivery.
3. **Privacy & data use** — what we collect (team name, player names, emails, optional phone), why (schedules, reminders, contact), who can see it (only team names/divisions are public; personal details are admin-only), that messages and orders are stored until removed, and how to ask for correction or deletion via the Contact page (GDPR-style rights).
4. **Liability & contact** — the site is provided as-is, the organizer is not liable for injuries, losses, or technical errors, terms may be updated (date shown), and questions go through the Contact page.

The page gets its own SEO title/description and a "Last updated" line, and a **"Terms" link is added to the site navigation and footer/contact bar** so it's reachable from everywhere.

### 2. "Read before using" notice
A slim, dismissible one-line notice at the top of the home page: **"Please read the Terms & Conditions before using this site."** with a link. Once dismissed it stays hidden (remembered in the browser).

### 3. Required consent checkbox — shuttle purchase & registration only
- **Shuttle order form** and **season registration form** each get a required checkbox: *"I have read and accept the Terms & Conditions"* (linked). The submit button stays disabled until it's ticked.
- **Submit score page: no checkbox** — only the existing 2-day note stays as it is.

No changes to scoring logic, schedules, admin tools, or any existing data.

## Technical details

- New route `src/routes/terms.tsx` with `head()` (unique title/description); content as styled sections reusing existing card/typography tokens.
- Nav entry added in `src/routes/__root.tsx` (Terms link, and in ContactBar/footer).
- Dismissible notice: small component on `src/routes/index.tsx`, dismissal stored in `localStorage`, rendered after hydration to avoid SSR mismatch.
- Checkbox state in `src/routes/shuttles.tsx` and `src/routes/register.tsx`; button `disabled` until checked; no server-side change needed (consent implied by submission).
- Verified with typecheck + browser checks on desktop (1280px) and mobile (390px).
