# Finish email domain verification (notify.send.motionsserien.se)

## Current state (verified live)
- The two nameserver records for `notify.send.motionsserien.se` (ns5/ns6.lovable.cloud) are live and correct at Strato.
- The TXT verification record is still missing from public DNS, so the domain cannot verify yet.
- App code already sends through `notify.send.motionsserien.se` with the default sender (Motionsserien HT-26 <noreply@motionsserien.se>).

## Steps

1. Add the TXT record at Strato:
   - Type: TXT
   - Host: `_lovable-email.send` (Strato appends `.motionsserien.se` automatically; type `_lovable-email.send.motionsserien.se` if it does not)
   - Value: `lovable_email_verify=bb5866106f0f134b3ef2f2e178b7f887ee78fc2855a7cc7e4d90521a2db6e9e7`
   - The value must be exactly this single line, no quotes, no extra spaces.
2. User says "check" after saving.
3. Re-verify the record is visible publicly and confirm the domain status flips to Active (Cloud → Emails → Verify domain).
4. Send one real test email (a score reminder or reply) and inspect the delivery result to confirm everything works.

## Limitation
The TXT record can only be added inside the user's private Strato account — this is the one manual step.
