# Fix the email verification record

## What I found (verified against live internet records)

At Strato, the whole name `mdrabiul.motionsserien.se` has been handed over ("delegated") to Lovable's name servers. Because of that, Strato no longer answers anything under that name — including the `_lovable-email.mdrabiul` verification record you added. The record exists in your Strato panel, but the internet never sees it, so verification can never complete.

The two nameserver values (`ns5.lovable.cloud`, `ns6.lovable.cloud`) are correct; only the name they sit on is one level too high.

## Recommended fix (one small change at Strato)

The handover must sit on `notify.mdrabiul`, not on `mdrabiul`.

1. In Strato DNS, find the two NS records with prefix `mdrabiul` and change the prefix to `notify.mdrabiul` (or delete and re-add with that prefix). Values stay `ns5.lovable.cloud` and `ns6.lovable.cloud`.
2. Keep the TXT record exactly as it is:
   - Prefix: `_lovable-email.mdrabiul`
   - Value: `lovable_email_verify=5fefce788207b4aa5ca998e7ed8bc485f42503084ea7399694a055f248beae27`
3. Say "check" and I confirm both records publicly, then run verification.

## Alternative — verified, if Strato blocks the two-part prefix

Checked: the email setup currently holds `notify.mdrabiul.motionsserien.se`, so this option means replacing it with a shorter sending name.

1. You remove the current sending name in the email settings and add `mdrabiul.motionsserien.se` instead.
2. The settings then issue a fresh verification value for that name. Its records will be:
   - NS on prefix `mdrabiul` (the delegation you already have — no change needed)
   - TXT on prefix `_lovable-email`, plain on the main domain, with the newly issued value
3. Important: the new TXT value will differ from the one above — I read it from the settings and give you the exact line; do not reuse an old value.
4. Confirmed this host is currently empty in public DNS, so there is nothing conflicting there.
5. I then point the app at `mdrabiul.motionsserien.se`.

Either route ends in a working sender; the recommended one needs no re-registration.

## After the records are correct

- I confirm the records publicly, then run verification until the sending name is active.
- I check that score reminders, question replies, general emails, and login emails all use it.
- I send one test email and report the delivery result.

## Unchanged

The visible sender stays **Motionsserien HT-26, noreply@motionsserien.se** in both options. Nothing else on the site changes.

## Limitation

I cannot sign in to your Strato account; the record change is the one step only you can do.
