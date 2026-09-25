# Email footer, rich-text emails, email all teams, payment filter and bulk paid

## What you will get

1. **Editable email footer.** In admin Email settings, a new "Footer" field, pre-filled with "Motionsserien HT-26 · Ludvika Badmintonklubb". Every email (replies, new emails, score reminders, payment reminders) uses your saved footer. If the field is empty, the standard footer is used.

2. **Outlook-style email editor.** When you write a new email or reply to a question, you get a toolbar with: bold, italic, underline, font size, text colour, highlight colour, bullet and numbered lists, alignment, links, and clear formatting. The email arrives with that formatting. The Swedish translation below it keeps the same formatting.

3. **Email all teams at once.** In "Send an email", a new recipient option, "All teams", sends your message to every player email on file. Each player gets their own copy, so nobody sees other people's addresses. Before sending you see how many people it goes to and must confirm. Afterwards you see a summary of how many were sent, skipped, or failed.

4. **Payments: filter and bulk paid.**
   - A search box to filter teams by name, plus All / Paid / Unpaid buttons.
   - A checkbox on each team, "Select all shown", and a "Mark selected as paid" button (plus "Mark all unpaid as paid"). You confirm first, and counters update right away.

## Technical details

- Add a `footer` text column to `email_settings` (default is the current wording). Update the defaults, validation, admin form and `getEmailSettings`. Pass `footer` into all four templates, which replace the hardcoded footer line.
- Build the editor with TipTap (StarterKit, Underline, TextStyle, Color, Highlight, Link, TextAlign, and a small font-size extension) in a `RichTextEditor` component used in compose-email-admin and the message reply box. It outputs HTML.
- Server-side, clean the HTML with an allowlist sanitizer that works on edge servers (allowed tags and inline styles only; scripts, event handlers and unsafe links are removed). Send the cleaned HTML to translation, with an instruction to translate text only and keep the tags. Clean the translated HTML again.
- The templates show the English and Swedish HTML blocks. Plain-text emails still work.
- Add an "all" mode to `sendGeneralEmail`: collect the unique player emails from the team contacts, send one email per recipient with a unique idempotency key, translate once, and return sent/skipped/failed counts. Admin-only (existing session check). The "one trigger to one recipient" rule applies per player.
- Add `bulkSetPaid({ teamIds })` to payments.functions.ts (admin-only), which upserts paid=true for those teams. The filter and selection state stay in payments-admin.tsx.
