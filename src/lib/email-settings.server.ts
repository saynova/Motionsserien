// Server-only helpers for admin-editable email closing and signature texts.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

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

/**
 * Reads the saved email settings, falling back to the defaults for any field
 * left empty, so an email can never go out without a closing or signature.
 */
export async function getEmailSettings(
  client: SupabaseClient<Database>,
): Promise<EmailSettings> {
  const { data, error } = await client
    .from("email_settings")
    .select("closing_en, closing_sv, signature")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return {
    closingEn: row?.closing_en?.trim() || DEFAULT_EMAIL_SETTINGS.closingEn,
    closingSv: row?.closing_sv?.trim() || DEFAULT_EMAIL_SETTINGS.closingSv,
    signature: row?.signature?.trim() || DEFAULT_EMAIL_SETTINGS.signature,
  };
}
