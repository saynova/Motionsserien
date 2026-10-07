// Sends the bilingual approved/rejected registration email to each distinct player address.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function sendRegistrationStatusEmails(opts: {
  client: SupabaseClient<Database>;
  status: "approved" | "rejected";
  tournamentName: string;
  teamName: string;
  emails: string[];
  key: string;
  oneDay?: boolean;
}) {
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const { getEmailSettings } = await import("./email-settings.server");
  const settings = await getEmailSettings(opts.client).catch(() => null);
  const unique = [...new Set(opts.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  for (const to of unique) {
    try {
      await sendTemplateEmail("registration-status", to, {
        templateData: {
          status: opts.status,
          tournamentName: opts.tournamentName,
          teamName: opts.teamName,
          siteUrl: "https://www.motionsserien.se",
          oneDay: opts.oneDay ?? false,
          ...(settings ? { signature: settings.signature, footer: settings.footer } : {}),
        },
        idempotencyKey: `reg-status-${opts.key}-${opts.status}-${to}-${Date.now()}`,
      });
    } catch (e) {
      console.error("registration status email failed", to, e);
    }
  }
}
