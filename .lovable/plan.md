# Ask the General

A public form where players can send questions, feedback, or scoring issues, and an inbox for you in the admin console.

## What players see

A new "Ask the General" section (own page, linked in the top navigation and from the contact bar):

- Email (required)
- Message / question (required)
- Optional: name and team name
- Optional topic choice: Question, Feedback, Scoring issue, Other
- After sending: a friendly confirmation. Messages are never shown publicly.

## What you see in the admin console

A new "Ask the General" inbox card:

- Newest messages first; each message is shown collapsed with topic, email, team/name, and time
- Click a message to expand and read the full question, plus action buttons
- Filter: New / Answered / All, with a count of new messages
- Mark as answered / mark back as new, and delete a message
- A "reply by email" link that opens your mail app with the sender's address prefilled

No emails are sent from the app (that still needs the domain set up), so replies go through your own mail app.

## Technical notes

- New table `public.messages`: id, topic, email, name, team_name, body, status (`new` / `answered`), created_at, updated_at, with the shared `updated_at` trigger.
- RLS: `anon` + `authenticated` may INSERT only with `status = 'new'`; no public SELECT (inbox is private). GRANT INSERT to both roles, GRANT ALL to `service_role`.
- Server functions in a new `src/lib/messages.functions.ts`: public `sendMessage` (zod-style validation: valid email ≤255, body 5–2000 chars, name/team ≤80, topic from a fixed list) writing via the service-role client; admin-gated `listMessages`, `setMessageStatus`, `deleteMessage` using the existing `requireAdmin` session gate.
- Query options added to `src/lib/tournament-query.ts`.
- New route `src/routes/ask.tsx` with its own `head()` metadata; link added in `src/routes/__root.tsx` nav and in `ContactBar`.
- New `MessagesAdmin` component rendered in `src/routes/admin.tsx` under the banner/shuttle row.
- Verify with a typecheck plus desktop and mobile checks of the form and inbox.
