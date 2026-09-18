# Finish email verification for `notify.mdrabiul.motionsserien.se`

## Current check

- The app is already configured to send through `notify.mdrabiul.motionsserien.se`.
- Both required nameserver records are live publicly: `ns5.lovable.cloud` and `ns6.lovable.cloud`.
- The required TXT ownership record is still missing publicly, so email verification remains pending.

## Plan

1. Add the missing TXT record at Strato:
   - Host: `_lovable-email.mdrabiul` if Strato appends `.motionsserien.se`; otherwise `_lovable-email.mdrabiul.motionsserien.se`
   - Value: `lovable_email_verify=5fefce788207b4aa5ca998e7ed8bc485f42503084ea7399694a055f248beae27`
2. Keep both existing `notify.mdrabiul.motionsserien.se` nameserver records unchanged.
3. Recheck public DNS after the record is saved.
4. Verify the domain in Email settings once the TXT record appears publicly.
5. Send one test email and inspect its delivery result.

## Limitation

I can verify the public DNS result, but I cannot sign in to or edit the private Strato account directly.
