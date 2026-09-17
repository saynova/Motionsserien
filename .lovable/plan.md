# Fix email provisioning failure for notify.motionsserien.se

## What happened

Sending from `notify.motionsserien.se` fails with **Provisioning failed**. The DNS records at Strato are all correct (verified directly). The real cause: that sender domain is still registered to your **old Lovable workspace** at the email provider, so this workspace cannot claim it. Retrying here will keep failing until the old registration is released.

Two ways forward:

## Option A — Release the old registration (recommended, keeps your existing address)

1. You contact Lovable support (the in-app help chat) and ask them to **release the email domain `notify.motionsserien.se` from the previous workspace** so it can be provisioned in this one.
2. Once they confirm, I re-run the email setup for `notify.motionsserien.se` here. No DNS changes needed — your Strato records already match.

## Option B — Use a fresh sender subdomain (works immediately, no support wait)

1. We set up a new sender domain, e.g. `mail.motionsserien.se` (or another prefix you like), through the email setup dialog.
2. You add the new DNS records at Strato (one TXT + two NS records — I will give you the exact values; the old `notify` records can then be removed).
3. Emails will then send from `rabiul@motionsserien.se` exactly as before — the code does not change, since the sender address stays the same.

## After either option

- I verify the domain flips to Active.
- I send a test and confirm reminders and question replies go out.
- Everything else (templates, reply inbox, compose box) already works and needs no changes.
