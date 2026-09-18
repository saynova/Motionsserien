# Make public season reads safe again

## What the warning was about

On 17 Sep a security change removed general read access to the season record and replaced it with a
narrow, field-by-field permission (meant to keep the payment details private). Public pages only ask for
the allowed fields, so the site works today — I confirmed it by reading the season the same way the site
does. But any read that touches one extra field is rejected outright with "permission denied", which is
what produced the three errors at 15:23 that day. Not currently broken, but fragile.

Since payment details being publicly visible is fine, the fix is simply to undo the field-level
restriction.

## The fix

1. Restore normal read access to the season record for visitors and signed-in users, covering all its
   fields (including the payment details), and remove the narrow field-by-field grants.
2. Simplify the registration page code so it reads the season name and payment details through the normal
   public read path instead of the special admin path it needed while the field was locked down.
3. Re-check the home, schedule, standings, progress, register and admin pages all load, and confirm a
   full read of the season record (including payment details) no longer errors.
4. Mark the monitoring warning resolved once verified.

## Technical notes

- Migration: `GRANT SELECT ON public.seasons TO anon, authenticated;` and
  `REVOKE SELECT ON public.seasons FROM anon, authenticated;` first to clear the column-level privileges,
  then re-grant at table level (plus existing `GRANT ALL ... TO service_role` stays). RLS policy
  `seasons public read` already allows public reads; no policy change needed.
- `src/lib/registration.functions.ts` `getRegistrationInfo` (~line 89): switch from `adminClient()` to the
  public `readClient()` for the `name, payment_details` read; drop the "not publicly readable" comment.
- No data moves; `seasons.payment_details` stays where it is. Admin save (`saveSeasonSettings`) unchanged.
- Verify: `bunx tsgo --noEmit`, a `select=*` read on `seasons` with the public key must succeed, then
  Playwright pass on `/`, `/schedule`, `/standings` (or relevant public pages), `/register`, `/admin`.
- Call project_monitoring--resolve_finding with `fixed` on finding
  `error_log_finding_00b6923ed513f83cdd395527c0f6b8e5` after verification.
