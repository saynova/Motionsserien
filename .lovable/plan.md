# Fix the "API error 409" when sending emails

## What's actually happening

The 409 is not a bug in your app. It means the email service refused the send because your sending address `notify.motionsserien.se` is not marked **Active** yet.

Good news: your DNS is done and correct.

- The verification record on `motionsserien.se` is present and matches.
- The two name servers for `notify.motionsserien.se` are correctly pointing to Lovable.

So nothing more is needed from you at Strato. The setup is in its final step on Lovable's side and will flip to Active on its own — usually minutes, occasionally longer while DNS spreads worldwide. Once it does, reminders and replies will send with no further changes.

## What I'll change in the app

Right now a failed send shows a raw technical error. I'll make it clear and calm instead:

1. **Friendly message instead of "API error 409"**
   - Clicking **Send reminder** or **Send reply** while the domain is still being set up shows:
     "Email sending isn't active yet — your sending address is still being verified. Try again shortly."
   - Other email failures (blocked address, too many sends at once) each get their own plain-language message.

2. **A small status line in the admin panel**
   - Above the questions inbox and team contacts, a one-line note appears while email is not yet active: "Email sending is being set up — reminders and replies will start working once it's active."
   - It disappears automatically once sending works, so you always know whether a failed send was your app or the setup.

3. **No email is lost**
   - When a reply can't be sent, the text you typed stays in the box so you can send it again in a moment instead of retyping it.

## Technical notes

- `sendScoreReminder` (`src/lib/reminders.functions.ts`) and `replyToMessage` (`src/lib/messages.functions.ts`) will catch `EmailAPIError`, and return a typed outcome (`domain_not_verified`, `emails_disabled`, `rate_limited`, `recipient_suppressed`, `unknown`) instead of throwing a raw error.
- Callers in `src/routes/admin.tsx` and `src/components/messages-admin.tsx` map those outcomes to toast copy; the reply textarea only clears on success.
- The status line reads a small server function that reports whether the last send attempt failed with `domain_not_verified`; no new tables.
- No DNS changes, no migrations.
