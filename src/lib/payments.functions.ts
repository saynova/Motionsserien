import { createServerFn } from "@tanstack/react-start";

export type TeamPaymentRow = {
  teamId: string;
  teamName: string;
  division: number | null;
  isPaid: boolean;
  paidAt: string | null;
  note: string;
  remindedAt: string | null;
  contacts: number;
};

export type TeamPaymentsData = {
  seasonId: string;
  seasonName: string;
  rows: TeamPaymentRow[];
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loadSeason(client: ReturnType<typeof import("./tournament.server").adminClient>) {
  const season = await client
    .from("seasons")
    .select("id, name, current_week, payment_details")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (season.error) throw new Error(season.error.message);
  if (!season.data) throw new Error("No active season found.");
  return season.data;
}

async function loadPayments(): Promise<TeamPaymentsData> {
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();
    const season = await loadSeason(client);

    const [teams, slots, payments, players] = await Promise.all([
      client.from("teams").select("id, name").order("name"),
      client
        .from("week_slots")
        .select("team_id, division")
        .eq("season_id", season.id)
        .eq("week_no", season.current_week),
      client
        .from("team_payments")
        .select("team_id, is_paid, paid_at, note, reminded_at")
        .eq("season_id", season.id),
      client.from("team_players").select("team_id, email"),
    ]);
    if (teams.error) throw new Error(teams.error.message);
    if (slots.error) throw new Error(slots.error.message);
    if (payments.error) throw new Error(payments.error.message);
    if (players.error) throw new Error(players.error.message);

    const rows: TeamPaymentRow[] = (teams.data ?? []).map((team) => {
      const slot = slots.data?.find((s) => s.team_id === team.id);
      const payment = payments.data?.find((p) => p.team_id === team.id);
      const contacts = (players.data ?? []).filter(
        (p) => p.team_id === team.id && isValidEmail(p.email ?? ""),
      ).length;
      return {
        teamId: team.id,
        teamName: team.name,
        division: slot?.division ?? null,
        isPaid: payment?.is_paid === true,
        paidAt: payment?.paid_at ?? null,
        note: payment?.note ?? "",
        remindedAt: payment?.reminded_at ?? null,
        contacts,
      };
    });

    rows.sort(
      (a, b) => (a.division ?? 99) - (b.division ?? 99) || a.teamName.localeCompare(b.teamName),
    );

    return { seasonId: season.id, seasonName: season.name, rows };
}

export const listTeamPayments = createServerFn({ method: "POST" }).handler(
  async (): Promise<TeamPaymentsData> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    return loadPayments();
  },
);

type SaveInput = { teamId: string; isPaid: boolean; note?: string };

export const saveTeamPayment = createServerFn({ method: "POST" })
  .inputValidator((data: SaveInput) => {
    if (typeof data?.teamId !== "string" || data.teamId.length < 10) {
      throw new Error("Team is required.");
    }
    return {
      teamId: data.teamId,
      isPaid: data.isPaid === true,
      note: typeof data?.note === "string" ? data.note.trim().slice(0, 200) : "",
    };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();
    const season = await loadSeason(client);

    const { error } = await client.from("team_payments").upsert(
      {
        season_id: season.id,
        team_id: data.teamId,
        is_paid: data.isPaid,
        paid_at: data.isPaid ? new Date().toISOString() : null,
        note: data.note,
      },
      { onConflict: "season_id,team_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

async function remindTeams(teamIds: string[]) {
  const { adminClient } = await import("./tournament.server");
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const { getEmailSettings } = await import("./email-settings.server");
  const client = adminClient();
  const season = await loadSeason(client);
  const settings = await getEmailSettings(client);

  const [teams, players] = await Promise.all([
    client.from("teams").select("id, name").in("id", teamIds),
    client.from("team_players").select("team_id, email").in("team_id", teamIds),
  ]);
  if (teams.error) throw new Error(teams.error.message);
  if (players.error) throw new Error(players.error.message);

  const paymentDetails =
    (season.payment_details ?? "").trim().length > 0
      ? (season.payment_details as string)
      : "Please swish the team fee to 1234785069, Ludvika Badmintonklubb. Reference: your team name.";

  const day = new Date().toISOString().slice(0, 10);
  let sent = 0;
  let suppressed = 0;
  const reminded: string[] = [];

  for (const teamId of teamIds) {
    const teamName = teams.data?.find((t) => t.id === teamId)?.name ?? "Your team";
    const recipients = (players.data ?? []).filter(
      (p) => p.team_id === teamId && isValidEmail(p.email ?? ""),
    );
    if (recipients.length === 0) continue;
    for (const recipient of recipients) {
      const result = await sendTemplateEmail("payment-reminder", recipient.email as string, {
        templateData: {
          teamName,
          seasonName: season.name,
          paymentDetails,
          closingEn: settings.closingEn,
          closingSv: settings.closingSv,
          signature: settings.signature,
        },
        idempotencyKey: `payment-${teamId}-${recipient.email}-${day}-${crypto.randomUUID().slice(0, 8)}`,
      });
      if (result.sent) sent += 1;
      else suppressed += 1;
    }
    reminded.push(teamId);
  }

  for (const teamId of reminded) {
    const { error } = await client.from("team_payments").upsert(
      { season_id: season.id, team_id: teamId, reminded_at: new Date().toISOString() },
      { onConflict: "season_id,team_id" },
    );
    if (error) console.error("Could not log payment reminder", error.message);
  }

  return { ok: true as const, sent, suppressed, teams: reminded.length };
}

export const sendPaymentReminder = createServerFn({ method: "POST" })
  .inputValidator((data: { teamId: string }) => {
    if (typeof data?.teamId !== "string" || data.teamId.length < 10) {
      throw new Error("Team is required.");
    }
    return { teamId: data.teamId };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const result = await remindTeams([data.teamId]);
    if (result.teams === 0) {
      throw new Error(
        "No player email addresses saved for this team. Add them in Team contacts first.",
      );
    }
    return result;
  });

export const remindAllUnpaid = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const data = await loadPayments();
  const unpaid = data.rows.filter((row) => !row.isPaid && row.contacts > 0).map((r) => r.teamId);
  if (unpaid.length === 0) {
    throw new Error("No unpaid teams with saved email addresses.");
  }
  return remindTeams(unpaid);
});
