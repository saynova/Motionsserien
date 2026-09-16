import { createServerFn } from "@tanstack/react-start";

export type TeamContact = {
  teamId: string;
  teamName: string;
  player1Name: string;
  player1Email: string;
  player2Name: string;
  player2Email: string;
};

export type ReminderRow = {
  match_id: string;
  sent_at: string;
  sent_to: number;
};

const SITE_URL = "https://www.motionsserien.se";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ------------------------------------------------------------- team contacts

export const listTeamContacts = createServerFn({ method: "POST" }).handler(
  async (): Promise<TeamContact[]> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    const [teams, players] = await Promise.all([
      client.from("teams").select("id, name").order("name"),
      client.from("team_players").select("team_id, player_no, name, email"),
    ]);
    if (teams.error) throw new Error(teams.error.message);
    if (players.error) throw new Error(players.error.message);

    return (teams.data ?? []).map((team) => {
      const rows = (players.data ?? []).filter((p) => p.team_id === team.id);
      const one = rows.find((p) => p.player_no === 1);
      const two = rows.find((p) => p.player_no === 2);
      return {
        teamId: team.id,
        teamName: team.name,
        player1Name: one?.name ?? "",
        player1Email: one?.email ?? "",
        player2Name: two?.name ?? "",
        player2Email: two?.email ?? "",
      };
    });
  },
);

type SaveContactsInput = {
  teamId: string;
  player1Name: string;
  player1Email: string;
  player2Name: string;
  player2Email: string;
};

export const saveTeamContacts = createServerFn({ method: "POST" })
  .inputValidator((data: SaveContactsInput) => {
    if (typeof data?.teamId !== "string" || data.teamId.length < 10) {
      throw new Error("Team is required.");
    }
    const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const out = {
      teamId: data.teamId,
      player1Name: clean(data.player1Name).slice(0, 80),
      player1Email: clean(data.player1Email).slice(0, 255),
      player2Name: clean(data.player2Name).slice(0, 80),
      player2Email: clean(data.player2Email).slice(0, 255),
    };
    for (const email of [out.player1Email, out.player2Email]) {
      if (email.length > 0 && !isValidEmail(email)) {
        throw new Error("Enter valid email addresses.");
      }
    }
    return out;
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    const rows = [
      { player_no: 1, name: data.player1Name, email: data.player1Email },
      { player_no: 2, name: data.player2Name, email: data.player2Email },
    ];

    for (const row of rows) {
      const existing = await client
        .from("team_players")
        .select("id")
        .eq("team_id", data.teamId)
        .eq("player_no", row.player_no)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);

      if (row.email.length === 0 && row.name.length === 0) {
        if (existing.data) {
          const { error } = await client.from("team_players").delete().eq("id", existing.data.id);
          if (error) throw new Error(error.message);
        }
        continue;
      }

      if (existing.data) {
        const { error } = await client
          .from("team_players")
          .update({ name: row.name, email: row.email })
          .eq("id", existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await client.from("team_players").insert({
          team_id: data.teamId,
          player_no: row.player_no,
          name: row.name,
          email: row.email,
        });
        if (error) throw new Error(error.message);
      }
    }

    return { ok: true as const };
  });

// ------------------------------------------------------------ score reminders

export const listReminders = createServerFn({ method: "POST" }).handler(
  async (): Promise<ReminderRow[]> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { data, error } = await adminClient()
      .from("score_reminders")
      .select("match_id, sent_at, sent_to")
      .order("sent_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ReminderRow[];
  },
);

export const sendScoreReminder = createServerFn({ method: "POST" })
  .inputValidator((data: { matchId: string }) => {
    if (typeof data?.matchId !== "string" || data.matchId.length < 10) {
      throw new Error("Match is required.");
    }
    return { matchId: data.matchId };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const client = adminClient();

    const match = await client
      .from("matches")
      .select("id, week_no, division, court, start_time, team_a_id, team_b_id")
      .eq("id", data.matchId)
      .maybeSingle();
    if (match.error) throw new Error(match.error.message);
    if (!match.data) throw new Error("Match not found.");

    const teams = await client
      .from("teams")
      .select("id, name")
      .in("id", [match.data.team_a_id, match.data.team_b_id]);
    if (teams.error) throw new Error(teams.error.message);
    const nameOf = (id: string) => teams.data?.find((t) => t.id === id)?.name ?? "Team";

    const players = await client
      .from("team_players")
      .select("team_id, name, email")
      .in("team_id", [match.data.team_a_id, match.data.team_b_id]);
    if (players.error) throw new Error(players.error.message);

    const recipients = (players.data ?? []).filter((p) => isValidEmail(p.email ?? ""));
    if (recipients.length === 0) {
      throw new Error(
        "No player email addresses saved for these teams. Add them in Team contacts first.",
      );
    }

    let sent = 0;
    let suppressed = 0;
    for (const player of recipients) {
      const isTeamA = player.team_id === match.data.team_a_id;
      const teamName = nameOf(player.team_id);
      const opponentName = nameOf(isTeamA ? match.data.team_b_id : match.data.team_a_id);
      const result = await sendTemplateEmail("missing-score-reminder", player.email, {
        templateData: {
          weekNo: match.data.week_no,
          division: match.data.division,
          court: match.data.court,
          startTime: match.data.start_time,
          teamName,
          opponentName,
          submitUrl: `${SITE_URL}/submit`,
        },
        idempotencyKey: `score-reminder-${match.data.id}-${player.email}-${new Date()
          .toISOString()
          .slice(0, 10)}`,
      });
      if (result.sent) sent += 1;
      else suppressed += 1;
    }

    const logged = await client
      .from("score_reminders")
      .insert({ match_id: match.data.id, sent_to: sent });
    if (logged.error) console.error("Could not log reminder", logged.error.message);

    return { ok: true as const, sent, suppressed };
  });
