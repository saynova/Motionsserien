import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });

export const getMatchedTeamInvitation = createServerFn({ method: "POST" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const { hashConfirmationToken } = await import("./team-confirmation.server");
    const { adminClient } = await import("./tournament.server");
    const hash = await hashConfirmationToken(data.token);
    const row = await adminClient().from("registrations")
      .select("team_name, target_season, player1_name, player2_name, player1_confirmation_hash, player1_confirmed_at, player2_confirmed_at, confirmation_expires_at, status")
      .eq("requires_player_confirmation", true)
      .or(`player1_confirmation_hash.eq.${hash},player2_confirmation_hash.eq.${hash}`).maybeSingle();
    if (row.error || !row.data || row.data.status === "rejected") throw new Error("This invitation is not available. Please contact the General.");
    const r = row.data;
    if (!r.confirmation_expires_at || new Date(r.confirmation_expires_at).getTime() < Date.now()) throw new Error("This invitation has expired. Please contact the General for a new invitation.");
    const first = r.player1_confirmation_hash === hash;
    // The secret authorizes just this team's names; no contacts or hashes returned.
    return { teamName: r.team_name, tournament: r.target_season, playerName: first ? r.player1_name : r.player2_name, partnerName: first ? r.player2_name : r.player1_name, confirmed: Boolean(first ? r.player1_confirmed_at : r.player2_confirmed_at), bothConfirmed: Boolean(r.player1_confirmed_at && r.player2_confirmed_at) };
  });

export const confirmMatchedTeam = createServerFn({ method: "POST" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const { hashConfirmationToken } = await import("./team-confirmation.server");
    const { adminClient } = await import("./tournament.server");
    const result = await adminClient().rpc("confirm_matched_player", { _hash: await hashConfirmationToken(data.token) });
    if (result.error) throw new Error("Unable to confirm this invitation. It may have expired; please contact the General.");
    const value = result.data as { confirmed?: boolean; bothConfirmed?: boolean } | null;
    return { confirmed: value?.confirmed === true, bothConfirmed: value?.bothConfirmed === true };
  });