// Shared (client-safe) defaults for the admin-editable email texts.
// Keep in sync with the email_settings table defaults.

export type EmailSettings = {
  closingEn: string;
  closingSv: string;
  /** Signature lines separated by newlines. */
  signature: string;
};

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  closingEn:
    "If you have any further questions, please feel free to contact me through the website’s contact form.",
  closingSv:
    "Om du har några ytterligare frågor är du välkommen att kontakta mig via kontaktformuläret på webbplatsen.",
  signature: "Best Regards\nThe General\nMd Rabiul Islam",
};
