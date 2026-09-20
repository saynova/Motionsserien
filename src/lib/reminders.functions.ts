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
          .slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}`,
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

// -------------------------------------------------------- general admin email

export type DivisionPlayer = {
  division: number;
  teamName: string;
  name: string;
  email: string;
};

export const listDivisionPlayers = createServerFn({ method: "POST" }).handler(
  async (): Promise<DivisionPlayer[]> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    const season = await client
      .from("seasons")
      .select("id, current_week")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (season.error) throw new Error(season.error.message);
    if (!season.data) return [];

    const slots = await client
      .from("week_slots")
      .select("team_id, division")
      .eq("season_id", season.data.id)
      .eq("week_no", season.data.current_week);
    if (slots.error) throw new Error(slots.error.message);

    const teamIds = (slots.data ?? []).map((s) => s.team_id);
    if (teamIds.length === 0) return [];

    const [teams, players] = await Promise.all([
      client.from("teams").select("id, name").in("id", teamIds),
      client.from("team_players").select("team_id, player_no, name, email").in("team_id", teamIds),
    ]);
    if (teams.error) throw new Error(teams.error.message);
    if (players.error) throw new Error(players.error.message);

    const out: DivisionPlayer[] = [];
    for (const slot of slots.data ?? []) {
      const teamName = teams.data?.find((t) => t.id === slot.team_id)?.name ?? "Team";
      const rows = (players.data ?? [])
        .filter((p) => p.team_id === slot.team_id)
        .sort((a, b) => (a.player_no ?? 0) - (b.player_no ?? 0));
      for (const row of rows) {
        if (!isValidEmail(row.email ?? "")) continue;
        out.push({
          division: slot.division,
          teamName,
          name: row.name ?? "",
          email: row.email as string,
        });
      }
    }
    return out.sort((a, b) => a.division - b.division || a.teamName.localeCompare(b.teamName));
  },
);

type GeneralEmailInput = {
  mode: "player" | "division" | "address";
  division?: number;
  email?: string;
  subject: string;
  body: string;
};

export const sendGeneralEmail = createServerFn({ method: "POST" })
  .inputValidator((data: GeneralEmailInput) => {
    const mode = data?.mode;
    if (mode !== "player" && mode !== "division" && mode !== "address") {
      throw new Error("Choose who should receive the email.");
    }
    const subject = (data?.subject ?? "").trim();
    const body = (data?.body ?? "").trim();
    if (subject.length < 2 || subject.length > 150) {
      throw new Error("Subject must be between 2 and 150 characters.");
    }
    if (body.length < 2 || body.length > 4000) {
      throw new Error("Message must be between 2 and 4000 characters.");
    }
    const email = (data?.email ?? "").trim();
    let emails: string[] = [];
    if (mode === "address") {
      emails = Array.from(
        new Set(
          email
            .split(/[,;\s]+/)
            .map((part) => part.trim().replace(/^<|>$/g, ""))
            .filter((part) => part.length > 0),
        ),
      );
      if (emails.length === 0) throw new Error("Enter at least one email address.");
      if (emails.length > 60) throw new Error("You can send to at most 60 addresses at a time.");
      const bad = emails.filter((one) => !isValidEmail(one));
      if (bad.length > 0) throw new Error(`These addresses look wrong: ${bad.join(", ")}`);
    } else if (mode === "player" && !isValidEmail(email)) {
      throw new Error("Enter a valid email address.");
    }
    const division = Number(data?.division ?? 0);
    if (mode === "division" && !(division >= 1 && division <= 10)) {
      throw new Error("Choose a division.");
    }
    return { mode, division, email, emails, subject, body };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { translateEmailBodyToSwedish } = await import("./translate-email.server");

    let recipients: { email: string; name: string }[] = [];
    if (data.mode === "address") {
      recipients = data.emails.map((one) => ({ email: one, name: "" }));
    } else {
      const all = await listDivisionPlayers();
      recipients =
        data.mode === "player"
          ? all
              .filter((p) => p.email.toLowerCase() === data.email.toLowerCase())
              .map((p) => ({ email: p.email, name: p.name }))
          : all
              .filter((p) => p.division === data.division)
              .map((p) => ({ email: p.email, name: p.name }));
      if (recipients.length === 0) {
        throw new Error(
          "No player email addresses found for that choice. Add them in Team contacts first.",
        );
      }
    }

    const day = new Date().toISOString().slice(0, 10);
    const tag = `${data.subject.length}-${data.body.length}`;
    const swedishBody = await translateEmailBodyToSwedish(data.body);
    let sent = 0;
    let suppressed = 0;
    for (const recipient of recipients) {
      const result = await sendTemplateEmail("general-email", recipient.email, {
        templateData: {
          name: recipient.name,
          subject: data.subject,
          englishBody: data.body,
          swedishBody,
        },
        idempotencyKey: `general-${tag}-${recipient.email}-${day}-${crypto.randomUUID().slice(0, 8)}`,
      });
      if (result.sent) sent += 1;
      else suppressed += 1;
    }

    return { ok: true as const, sent, suppressed };
  });
