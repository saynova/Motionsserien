# Player accounts, team-linked scores and invoices

One login for the whole site, used for registering, submitting scores and getting invoices. It stays the same across every future tournament.

## Decisions
- Sign-in is required to submit scores **from the next tournament only**. The current season keeps open score submission.
- **One account registers one team.** The player who registers already has their account, so they never sign up again to submit scores.
- **Player 2 can use any email** to make their own account and join the team.
- The invoice design comes from **your PDF template**. The app fills in only **Namn** and **Datum**.

## 1. Accounts and sign-in
- A new **Sign in / Create account** page with three options: email and password, Google, and Apple.
- Email accounts must confirm their email before they can do anything. Google and Apple emails count as confirmed.
- **Browsers can save the password.** The sign-in and sign-up forms are built so Chrome, Safari, Edge and phone password managers offer to save and fill it in.
- You stay signed in on that browser until you choose **Sign out**.
- Forgot-password and reset-password pages.
- The site header shows "Sign in" when you're signed out, and a **My account** menu with **Sign out** when you're signed in.
- A **My account** page shows your team for each tournament, your score status and your invoices.
- The admin area keeps its own password sign-in. Player accounts get no admin access.

## 2. Team registration (next tournament onward)
- You must be signed in and verified to register a team. Your account email fills in as Player 1 automatically.
- Each account can register **only one team per tournament**.
- After registering, Player 1 gets a short **team join code** on My account to share with their partner.
- Player 2 signs in with **any email** and enters the code, and their account is linked to the team. A team can have at most two linked accounts.
- Protection against duplicates:
  - one team name per tournament
  - an account can be on only one team per tournament
  - the same account can't register twice
- Each tournament keeps its own teams and players. Accounts carry over to the next one.
- When the admin approves a team, it gets every feature automatically: standings, schedule, payments and reminders.

## 3. Score submission (next tournament onward)
- A setting per season: "Require sign-in to submit scores". It is on by default for new seasons and off for the current one.
- When it's on, the submit page lists only matches where your team is playing. The server checks this again, so nobody can submit for another team.
- Each score is recorded with the tournament, team, player and account. The current details (IP, device and so on) are still recorded too.
- Admin notifications and approval work exactly as they do today. The admin match list also shows who submitted each score.

## 4. Invoices after the tournament
- When the admin marks the tournament as finished, each linked player sees **Get invoice** on My account.
- You choose **800 kr** (the whole team amount) or **400 kr** (half).
- Limits the system enforces automatically:
  - a team can never go over 800 kr in total
  - after an 800 kr invoice, the partner can't get one
  - after a 400 kr invoice, the partner can get only 400 kr
  - one invoice per player per tournament
- The invoice is made from your PDF with Namn and Datum filled in. You can download it, and a copy is emailed to your confirmed address.
- Every invoice is kept permanently: player, account, team, tournament, amount, date, status and invoice number. You can download it again at any time, but it is never created twice.
- A new admin **Invoices** section lists all invoices, filterable by tournament and team. The admin can void an invoice, which frees up that amount again.

## Needed from you
- **Invoice PDF template:** please upload it. Until you do, the invoice step will be ready but switched off.
- **Apple sign-in:** it works through the built-in setup. Test it once it's live.

## Technical details
- Auth: turn on email auth plus the managed Google and Apple providers. Keep auto-confirm off. Add `/auth`, `/reset-password` and `_authenticated/account`. Listen for sign-in changes in `__root`.
- New tables, each with grants and row-level security:
  - `team_members` (season, team, player number, email, user id; unique by season and email). User ids are linked by matching the verified email, done in the server at sign-in or registration.
  - `invoices` (season, team, player, user id, amount of 400 or 800, invoice number, status, created time). A locked database function checks the team's 800 kr total, blocking concurrent claims with a row lock. A unique constraint allows one active invoice per user per season.
  - Season settings: `require_login_for_scores` and `invoices_open`.
- `matches` gains `submitted_user_id` and `submitted_team_id`. The submit server function uses `requireSupabaseAuth` when the season needs it, and checks that the user belongs to team A or team B.
- Registrations gain `user_id`. Submitting needs auth when the target season is marked account-based.
- Invoice PDF: `pdf-lib` in a server function. It loads the template from private storage, stamps Namn and Datum at fixed positions measured from the template, stores the result in a private `invoices` bucket, returns a short-lived signed URL, and emails the PDF as an attachment from notify.motionsserien.se.
- Players can read only their own team memberships and invoices. Admin functions use the existing admin session.
