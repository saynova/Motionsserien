import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function hashConfirmationToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function newConfirmationToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** One invitation for one specific matched player; no arbitrary browser recipient. */
export async function sendMatchedPlayerInvitation(db: SupabaseClient<Database>, registrationId: string, playerNo: 1 | 2, token: string) {
  const row = await db.from("registrations").select("team_name, target_season, player1_name, player2_name, player1_email, player2_email").eq("id", registrationId).single();
  if (row.error) throw new Error("Team not found.");
  const { getEmailSettings } = await import("./email-settings.server");
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const settings = await getEmailSettings(db).catch(() => null);
  try {
    const result = await sendTemplateEmail("team-match-invitation", playerNo === 1 ? row.data.player1_email : row.data.player2_email, {
      templateData: {
        playerName: playerNo === 1 ? row.data.player1_name : row.data.player2_name,
        partnerName: playerNo === 1 ? row.data.player2_name : row.data.player1_name,
        teamName: row.data.team_name,
        tournamentName: `Motionsserien ${row.data.target_season}`,
        // Fragment keeps the invitation secret out of access logs and referrers.
        confirmationUrl: `https://www.motionsserien.se/team-confirmation#${token}`,
        ...(settings ? { signature: settings.signature, footer: settings.footer } : {}),
      },
      idempotencyKey: `team-match-${registrationId}-${playerNo}-${await hashConfirmationToken(token)}`,
    });
    return result.sent;
  } catch {
    console.error("Matched player invitation could not be sent", registrationId, playerNo);
    return false;
  }
}