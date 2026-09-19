# Fix "Email API error 403 — no matching sender domain"

## What's happening

Good news: your email domain **`notify.motionsserien.se` is now verified and ready
to send**. The 403 error happens because the app is still set to send through the
old experimental address `notify.send.motionsserien.se`, which was never verified.
The email service only accepts sends from the verified domain, so it refuses.

## Fix (one value, two files)

Update the sender setting from `notify.send.motionsserien.se` to
`notify.motionsserien.se` in:

1. `src/lib/email-templates/send-email.ts` — used by score reminders, message
   replies, and the "Send an email" box.
2. `src/routes/lovable/email/auth/webhook.ts` — used by login/signup emails.

Nothing else changes: the visible sender stays **Motionsserien HT-26
<noreply@motionsserien.se>**, all templates and pages stay the same.

## Verification

- Typecheck passes.
- Then send one test email from the admin panel ("Send an email" → Any address →
  your own address) to confirm delivery works end to end.
