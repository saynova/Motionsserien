# Show the junk/spam email reminder only after submission

## What changes

The line "Please check your junk/spam folder…" currently sits inside the forms and is visible the whole time someone is filling them in. It will be removed from all form bodies and instead shown as part of a polished, professional thank-you screen that appears right after a successful submission.

## Where it applies

1. **Register a team (main tournament, guest form)** — remove the reminder from the form; keep and polish the post-submit "Thanks — your team is registered" screen with a thank-you heading, success icon and the junk/spam note.
2. **Register a team (main tournament, signed-in form)** — remove the reminder from the form; the "You're registered" panel that appears after submitting becomes the professional thank-you display (success icon, thankful heading, junk/spam note).
3. **Find me a partner (guest form)** — remove the reminder from the form; the "Your request has been received" screen gets a thank-you heading, success icon and the junk/spam note.
4. **Find me a partner (signed-in form)** — after sending, the existing status panel becomes the thank-you display with the junk/spam note.
5. **One-day tournament registration** — remove the reminder from the form; the "Thanks — you're registered!" screen gets the professional thank-you treatment with the junk/spam note.

## Implementation

- Update `src/components/registration-email-reminder.tsx` so it renders as a subtle, professional note (softer icon and styling suited to sitting inside a success card).
- Edit `src/components/account-registration.tsx`, `src/components/guest-partner-request.tsx` and `src/routes/one-day.tsx`:
  - delete the pre-submit reminder from each form,
  - restyle the four post-submit/success panels into a consistent thank-you card (success icon, thankful heading, short "what happens next" line, then the junk/spam note).
- No backend, email, or wording changes — the reminder sentence itself stays exactly as specified.

## Verification

- Typecheck/build passes.
- Playwright check: /register and /one-day — the reminder is not visible while a form is open, and appears on the thank-you screen after a test submission (test data removed afterwards where applicable).
