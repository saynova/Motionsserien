# Fix "Email API error 409 — this send already failed"

## What's happening

Your domain is verified and working — this error is not about the domain.

Every email the admin panel sends carries a "fingerprint" (an idempotency key) built
from the match/message/recipient and the day, e.g. `general-<lengths>-<email>-<date>`.
Its purpose is to stop accidental double-sends when you click twice.

The catch: if the first send with a given fingerprint *failed* (for example while the
domain was still unverified, or a temporary provider hiccup), the email service
permanently refuses any later send with the same fingerprint and answers exactly the
409 error you saw. So retries of the same email are stuck forever.

## Fix

In `src/lib/email-templates/send-email.ts` (the one shared send helper, so all three
email types are fixed at once):

1. Catch the specific "already failed" error (409 / `run_failed`) and automatically
   retry the send once with a fresh fingerprint. You see one successful send instead
   of an error; genuine duplicate-protection for in-flight clicks is unaffected.
2. As a belt-and-braces change, make the three call sites generate a unique
   fingerprint per attempt by appending a random suffix:
   - `src/lib/reminders.functions.ts` — score reminder key and general-email key
   - `src/lib/messages.functions.ts` — message-reply key

   Each new click still dedupes double-submits within the same click (the loop reuses
   one fingerprint per recipient), but a failed send can always be retried.

## Verification

- Typecheck passes.
- Confirm with a real send from the admin panel once the domain shows Active
  (send one test email to yourself via "Send an email" → Any address).

## Technical details

- Files: `src/lib/email-templates/send-email.ts`, `src/lib/reminders.functions.ts`,
  `src/lib/messages.functions.ts`.
- No changes to templates, sender address, or any visible page.
