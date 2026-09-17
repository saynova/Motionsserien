# Recover email sending with the replacement subdomain

## Confirmed cause

- `notify.motionsserien.se` cannot be provisioned because it is still owned by another email-provider account, most likely the previous workspace. Retrying that domain will not fix it.
- Its Strato DNS records are already correct, so changing those records again is unnecessary.
- The clean replacement is already registered as `notify.mail.motionsserien.se`.
- Both required nameserver records for the replacement are live, but its TXT ownership record is currently missing.

## Plan

1. Complete the replacement domain in Strato by adding the exact TXT record shown for `notify.mail.motionsserien.se`:
   - Host: `_lovable-email.mail` if Strato appends `.motionsserien.se`; otherwise `_lovable-email.mail.motionsserien.se`
   - Value: `lovable_email_verify=5c4c22aaf37c0a5e60e442cdd04ea08150e59fc418bbaf2b05b22472d1ae16b5`
   - Keep the existing `ns5.lovable.cloud` and `ns6.lovable.cloud` records unchanged.
2. Recheck public DNS and trigger domain verification after the TXT record appears.
3. Update both regular app emails and account/auth emails to use `notify.mail.motionsserien.se` as the verified technical sender domain.
4. Keep the visible sender and reply address as `rabiul@motionsserien.se`.
5. Verify the email code, public pages, and admin page still work, then test a reminder or reply and inspect its delivery result.
6. After successful delivery, leave the failed old `notify.motionsserien.se` entry unused and recommend removing it from Email settings to avoid future confusion.

## Limitation

I cannot sign in to or directly control the private Strato account. The only manual action is adding the missing TXT record; I can verify it publicly and finish everything else afterward.
