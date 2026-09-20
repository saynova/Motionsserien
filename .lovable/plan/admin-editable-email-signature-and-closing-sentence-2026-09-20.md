# Admin-editable email signature and closing sentence

## Why you can't edit them today

The closing sentence and signature are written directly into the email template code, so they can only be changed by editing the site's code — not from your admin page.

## What will change

- A new **Email settings** section in your admin page where you can edit and save:
  - The **closing sentence** in English and Swedish (today: "If you have any further questions…" / "Om du har några ytterligare frågor…")
  - The **signature** lines (today: "Best Regards / The General / Md Rabiul Islam")
- Your saved texts are used in every outgoing email: replies to messages, general emails, and score reminders.
- Fields come pre-filled with the current wording, so nothing changes until you edit something yourself.
- Saving shows a confirmation; empty fields fall back to the current standard wording so an email can never go out with a missing signature.

## Technical details

- New table `email_settings` (single row) with the closing text (EN/SV) and signature lines; RLS enabled, no public/anonymous read, admin-only writes via a server function with the existing admin session check.
- A server function reads the settings when composing each email (general email, message reply, score reminder) and passes them into the templates as fields; the templates stop hardcoding these texts.
- A new `EmailSettingsAdmin` component added to the admin page, wired into the existing admin section navigation.
- Verify typecheck and the new admin section in the preview.
