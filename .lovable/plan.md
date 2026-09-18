# Fix the email verification record

## What I found

I checked the live internet records just now, and this time the cause is clear and it is not a typo in the value.

At Strato, the whole name `mdrabiul.motionsserien.se` has been handed over ("delegated") to Lovable's name servers. Because of that, Strato no longer answers anything under that name — including the `_lovable-email.mdrabiul` verification record you just added. The record exists in your Strato panel, but the internet never sees it, so verification can never complete.

The nameserver records themselves (`ns5.lovable.cloud`, `ns6.lovable.cloud`) are live and correct.

## The fix (one small change at Strato)

The handover must sit one level deeper, on `notify.mdrabiul`, not on `mdrabiul`.

1. In Strato DNS, find the two NS records whose prefix is `mdrabiul` and change the prefix to `notify.mdrabiul` (or delete them and re-add with that prefix). Values stay `ns5.lovable.cloud` and `ns6.lovable.cloud`.
2. Keep the TXT record exactly as you have it:
   - Prefix: `_lovable-email.mdrabiul`
   - Value: `lovable_email_verify=5fefce788207b4aa5ca998e7ed8bc485f42503084ea7399694a055f248beae27`
3. Say "check" and I will confirm both records publicly and then trigger verification.

If Strato does not allow a two-part prefix like `notify.mdrabiul`, tell me and we use the simpler alternative below instead.

## Alternative if Strato blocks the deeper prefix

Use `mdrabiul.motionsserien.se` itself as the sending name — that matches the handover you already have in place:

1. Keep the NS records on prefix `mdrabiul` unchanged.
2. Move the TXT record to prefix `_lovable-email` (plain, on the main domain), same value as issued for that name.
3. I register `mdrabiul.motionsserien.se` in the email settings and point the app at it.

## After the records are correct

- I confirm the records publicly, then run verification until the domain is active.
- I check that score reminders, question replies, general emails, and login emails all use the verified sending name.
- I send one test email and report the delivery result.

## Unchanged

The visible sender stays **Motionsserien HT-26 &lt;noreply@motionsserien.se&gt;** in both options. No other part of the site changes.

## Limitation

I cannot sign in to your Strato account; the record change is the one step only you can do.
