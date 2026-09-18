# Fix email setup — Strato rejects the two-level `mdrabiul` NS prefix

## Why it's stuck
The current sender domain `notify.mdrabiul.motionsserien.se` is a two-level
subdomain. Strato's DNS editor only accepts NS records for subdomains that
are registered inside Strato itself, so it refuses the `notify.mdrabiul`
prefix. The verification TXT alone can never complete the setup — the NS
handover is mandatory.

## Plan — use a simple one-level sender domain (recommended)

1. Remove the stuck `notify.mdrabiul.motionsserien.se` entry and add a fresh,
   one-level sender domain through the email setup, e.g.
   **`send.motionsserien.se`** (unused before, so no leftover claim from the
   old workspace, and no two-level prefix that Strato rejects).
2. Lovable will show the exact records for that new domain — one TXT and two
   NS records. The user adds them at Strato with simple prefixes
   (`_lovable-email` and `send`), which Strato accepts — this exact pattern
   already worked before for `notify`.
3. Update the app's sender setting in `send-email.ts` and the auth webhook
   from `notify.mdrabiul.motionsserien.se` to the new domain (one value in
   each file). The visible sender stays
   **Motionsserien HT-26 <noreply@motionsserien.se>** — players see no
   difference.
4. Once verification turns Active, send one test reminder/reply and check its
   delivery result.

## Alternative (keeps `notify.mdrabiul...` exactly as registered)
In Strato: Domains → manage `motionsserien.se` → **create the subdomain
`mdrabiul.motionsserien.se`** first (Strato's subdomain management, not the
DNS record list). Once it exists, Strato's DNS editor accepts NS records with
prefix `notify.mdrabiul` — then add the two NS values (`ns5`/`ns6.lovable.cloud`)
and keep the existing TXT `_lovable-email.mdrabiul` record unchanged.
This works but is more steps inside Strato and easier to get wrong.

## Technical details
- Files touched (option 1 only): `src/lib/email-templates/send-email.ts`,
  `src/routes/lovable/email/auth/webhook.ts` — the `SENDER_DOMAIN` constant.
- No changes to visible sender name/address, templates, or any page.
- Nameserver pair for a new domain is assigned fresh — values will be read
  from Email settings after the domain is added, never reused from memory.
