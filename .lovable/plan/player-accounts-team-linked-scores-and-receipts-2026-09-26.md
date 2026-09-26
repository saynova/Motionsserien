# Player accounts, team-linked scores and receipts

One login for the whole site, used for registering, submitting scores and getting receipts. It stays the same across every future tournament.

## Decisions
- Sign-in is required to submit scores **from the next tournament only**. The current season keeps open score submission.
- **One account registers one team.** The player who registers already has their account, so they never need to sign up again to submit scores.
- **Player 2 can use any email** to make their own account and join the team.
- Receipts use **your Word template** ("Kvittens träningsavgift"):
  - Page 1 is the 400 kr receipt (376 + 24,00 moms).
  - Page 2 is the 800 kr receipt (752 + 48,00 moms).
  - Only **Namn** and **Datum** are filled in. Everything else stays exactly as in your template.
  - Players always get a **PDF**.

## 1. Accounts and sign-in
- A new **Sign in / Create account** page with three options: email and password, Google, and Apple.
- Email accounts must confirm their email first. Google and Apple emails count as confirmed.
- After signing up, the page says: "We've sent you a confirmation email. If you can't find it, check your **junk or spam** folder." The same reminder appears on the forgot-password page.
- **Browsers can save the password.** The forms are built so Chrome, Safari, Edge and phone password managers offer to save and fill it in.
- You stay signed in on that browser until you choose **Sign out**.
- Forgot-password and reset-password pages.
- The site header shows "Sign in" when you're signed out, and a **My account** menu with **Sign out** when you're signed in.
- A **My account** page shows your team for each tournament, your score status and your receipts.
- The admin area keeps its own password sign-in. Player accounts get no admin access.

## 2. Team registration (next tournament onward)
- You must be signed in and verified to register a team. Your account email fills in as Player 1 automatically.
- Each account can register **only one team per tournament**.
- Player 2 signs up with **any email**, then **picks their team** from a list of this tournament's teams that are still missing a second player. No code is needed.
- Player 2 is added **straight away**, and Player 1 gets an email saying Player 2 has joined. If someone joins the wrong team, the admin can remove them in the admin page.
- A team can have at most two accounts.
- Protection against duplicates:
  - one team name per tournament
  - an account can be on only one team per tournament
- Each tournament keeps its own teams and players. Accounts carry over to the next one.
- When the admin approves a team, it gets every feature automatically: standings, schedule, payments and reminders.

## 2b. Find a partner
- While registration is open, the Register page has a second option: **"I don't have a partner – find me one"**.
- A signed-in player fills in their name, level (previous division or new), availability, and an optional note. Their email comes from their account.
- This information is visible **only to the admin**, never publicly.
- A solo player is **not confirmed** until the admin approves them. They get no team, can't submit scores and don't appear anywhere public.
- A new admin **Find a partner** list shows every solo player, each with **Approve** or **Reject**.
- The admin picks two approved solo players and clicks **Pair up**. This creates a team that stays **pending** until the admin approves it in the normal registration list. Only then is the team confirmed.
- If the admin can't find a match yet, the player simply stays waiting on the list until another solo player registers.
- Emails go out when a player is approved, when they are paired (with their partner's name and team name), and when the team is confirmed.
- On My account the player sees their status (Waiting for approval, Approved – looking for a partner, Paired – awaiting team approval, or Team confirmed) and can withdraw.
- Paired players then work exactly like any other team.
- New partner requests also appear in admin Notifications.

## 3. Score submission (next tournament onward)
- A setting per season: "Require sign-in to submit scores". It is on by default for new seasons and off for the current one.
- When it's on, the submit page lists only matches your team plays. The server checks this again, so nobody can submit for another team.
- Each score is recorded with the tournament, team, player and account. The IP and device are still recorded as today.
- Admin notifications and approval work exactly as they do today. The admin match list also shows who submitted each score.

## 4. Receipts after the tournament
- When the admin marks the tournament as finished, each linked player sees **Get receipt** on My account.
- You choose **800 kr** (the whole team amount) or **400 kr** (half).
- Limits the system enforces automatically:
  - a team can never go over 800 kr in total
  - after an 800 kr receipt, the partner can't get one
  - after a 400 kr receipt, the partner can get only 400 kr
  - one receipt per player per tournament
- You can download the PDF, and a copy is emailed to your confirmed address.
- Every receipt is kept permanently: player, account, team, tournament, amount, date, status and receipt number. You can download it again at any time, but it is never created twice.

## 5. Admin: who has received a receipt
- A new admin **Receipts** section lists every team in the tournament. For each team it shows:
  - which players have received a receipt, with the amount and date
  - how much of the 800 kr has been used and how much is left
- Filters: All, Received, Partly received (400 of 800) and Not received. You can also search by team or player.
- The admin can download any receipt or void one, which frees up that amount again.
- Every new receipt also appears in admin Notifications.

## Notes
- Ort, Period ("Motionsserien HT 2026"), Referens and the amounts come straight from your template. For a new season, you send an updated template.
- Apple sign-in uses the built-in setup. Test it once it's live.

## Technical details
- Auth: turn on email auth plus the managed Google and Apple providers. Keep auto-confirm off. Add `/auth`, `/reset-password` and `_authenticated/account`, and listen for sign-in changes once in `__root`.
- Forms: use a real `<form>` with `autocomplete` values `email`, `current-password` and `new-password`, and keep the session between visits so password managers work.
- New tables, each with grants and row-level security:
  - `team_members` (season, team, player number, user id). Unique by season and user, with at most 2 per team. Player 2 joins through a server function that adds the row straight away and emails Player 1 a "partner added" message using a new app email template. The admin can remove a member.
  - `partner_requests` (season, user id, name, level/previous division, availability, note, status pending/approved/rejected/paired/withdrawn). Unique per season and user. Players read only their own request. The admin reads all of them through the admin session. "Pair up" accepts only two approved requests and creates a `pending` registration plus both member links in one step. The team goes live only after normal registration approval.
  - `invoices` (season, team, player, user id, amount of 400 or 800, receipt number, status, created time). A locked database function checks the team's 800 kr total, using a row lock so two players claiming at once can't both succeed. A unique constraint allows one active receipt per user per season.
  - Season settings: `require_login_for_scores` and `invoices_open`.
- `matches` gains `submitted_user_id` and `submitted_team_id`. The submit server function uses `requireSupabaseAuth` when the season needs it, and checks that the user belongs to team A or team B.
- Registrations gain `user_id`. Registration needs a signed-in user when the target season is account-based.
- Receipt PDF:
  - Convert the Word template once with LibreOffice into two single-page PDF templates, with the sample name and date blanked out. Store them in private storage.
  - At run time, `pdf-lib` in a server function stamps Namn and Datum at measured positions, stores the file in a private `invoices` bucket, returns a short-lived signed URL, and emails the PDF as an attachment from notify.motionsserien.se.
- Admin receipts list and void action use the existing admin session. Players can read only their own memberships and receipts.
