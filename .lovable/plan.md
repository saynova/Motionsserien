# Make public season reads safe again

## What the warning was about

On 17 Sep a security change removed general read access to the season record and replaced it with a
narrow, field-by-field permission (to keep the payment details private). Public pages only ask for the
allowed fields, so the site works today — I confirmed it just now by reading the season the same way the
site does. But any read that touches one extra field is rejected outright with "permission denied", which
is what produced the three errors at 15:23 that day.

So: not currently broken, but fragile. One overlooked field in a future query takes down the schedule and
standings pages for every visitor.

## The fix

Keep the payment details private, but stop the public season record from depending on field-level
permissions.

1. Move the payment details out of the season record into a small separate admin-only table, so nothing
   public-facing can ever touch them.
2. Give back normal read access to the season record itself (name, start date, weeks, current week,
   active flag) — the only fields left there are already public on the site.
3. Point the registration page's payment note and the admin "season settings" save at the new location.
4. Re-check that the home, schedule, standings, progress, register and admin pages all load, and that a
   full read of the season record no longer errors.

## Technical notes

- Migration: create `public.season_payment_details` (`season_id` referencing `seasons`, `payment_details`,
  timestamps + updated_at trigger); copy existing values across; drop `seasons.payment_details`;
  `GRANT SELECT ON public.seasons TO anon, authenticated` (replacing the column-level grants) and
  `GRANT ALL ON public.season_payment_details TO service_role` only — no anon/authenticated grants, RLS
  enabled with no public policy.
- `src/lib/registration.functions.ts`: `getRegistrationInfo` (~line 89) reads the payment text from the new
  table via `adminClient`; `saveSeasonSettings` (~line 308) upserts there instead of updating `seasons`.
- `src/lib/registration.functions.ts` new-season creation (~line 510) inserts the season without
  `payment_details`, then writes the payment row if provided.
- `src/lib/tournament.functions.ts` new-season path (~line 531) likewise.
- Existing explicit column lists (`SEASON_COLUMNS` etc.) stay as they are; they keep working.
- Verify with `bunx tsgo --noEmit`, a full `select=*` read on `seasons` using the public key, and route checks.
- Resolve the monitoring finding once verified.
