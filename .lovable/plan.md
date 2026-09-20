# Automatic bilingual email replies and messages

## What will change

- When you type an English reply in **Ask the General**, the site will translate it to Swedish before sending.
- When you write a new email in **Send an email**, both the subject and message will be translated to Swedish before sending.
- Recipients will always see the English version first and the Swedish version second, clearly labelled.
- Every outgoing tournament email—including score reminders—will end with the requested contact sentence in both languages, followed by:

  Best Regards  
  The General Md Rabiul Islam

- The admin email forms will explain that Swedish is added automatically, while you continue writing only in English.

## Technical details

- Add a server-only translation helper using Lovable AI with strict English-to-Swedish output validation and no exposure of email addresses or player details to the translation request.
- Translate each unique subject/body once before sending bulk emails, not once per recipient.
- Pass separate English and Swedish fields into the reply and general-email templates; preserve paragraph breaks and the original submitted question.
- Keep the existing bilingual score-reminder wording, adding only the standardized closing and signature.
- If translation fails, stop the send and show a clear error instead of delivering an English-only email.
- Verify the relevant typecheck and the admin email/reply controls on desktop and mobile.
