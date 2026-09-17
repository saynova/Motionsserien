# Switch sender domain to noreply.motionsserien.se

## Status

- Old domain `notify.motionsserien.se`: deleted from this workspace (it was stuck because the old workspace still owned it at the email provider).
- New subdomain `noreply.motionsserien.se`: created at Strato, but not yet registered inside this Lovable workspace.

## Steps

1. **You**: add `noreply.motionsserien.se` in the email setup (button below). Setup shows you the exact DNS records.
2. **You at Strato**: add the TXT record shown in setup for `_lovable-email` (the NS records for `noreply` you already added — confirm they point to the two nameservers shown in setup). The old `notify` records can be removed afterwards.
3. **Me**: once it verifies, I confirm the domain is Active and that reminders, question replies, and the compose box send as **Md Rabiul Islam · rabiul@motionsserien.se** — the email code and all templates need no changes.
4. **Me**: run a quick test send to confirm delivery works end to end.

Note: since this is a fresh sending address, the first emails to each player may land in junk again for a short warm-up period — ask players to mark "Not junk" once.
