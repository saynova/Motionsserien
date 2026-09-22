const SITE_URL = "https://www.motionsserien.se";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Sends the bilingual missing-score reminder to both players of both teams of
 * every match in the current week that still has no submitted result.
 * Each match is reminded at most once per calendar day.
 */
export async function sendAutomaticScoreReminders() {
  const { adminClient } = await import("./tournament.server");
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const { getEmailSettings } = await import("./email-settings.server");
  const client = adminClient();

  const season = await client
    .from("seasons")
    .select("id, current_week")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (season.error) throw new Error(season.error.message);
  if (!season.data) return { matches: 0, sent: 0, skipped: 0 };

  const matches = await client
    .from("matches")
    .select("id, week_no, division, court, start_time, team_a_id, team_b_id, status, s1a, s1b")
    .eq("season_id", season.data.id)
    .eq("week_no", season.data.current_week);
  if (matches.error) throw new Error(matches.error.message);

  const missing = (matches.data ?? []).filter(
    (match) => match.s1a === null || match.s1b === null,
  );
  if (missing.length === 0) return { matches: 0, sent: 0, skipped: 0 };

  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const recent = await client
    .from("score_reminders")
    .select("match_id")
    .gte("sent_at", since);
  if (recent.error) throw new Error(recent.error.message);
  const alreadyReminded = new Set((recent.data ?? []).map((row) => row.match_id));

  const teamIds = [
    ...new Set(missing.flatMap((match) => [match.team_a_id, match.team_b_id])),
  ];
  const [teams, players] = await Promise.all([
    client.from("teams").select("id, name").in("id", teamIds),
    client.from("team_players").select("team_id, email").in("team_id", teamIds),
  ]);
  if (teams.error) throw new Error(teams.error.message);
  if (players.error) throw new Error(players.error.message);
  const nameOf = (id: string) => teams.data?.find((t) => t.id === id)?.name ?? "Team";

  const settings = await getEmailSettings(client);
  const day = new Date().toISOString().slice(0, 10);

  let sent = 0;
  let skipped = 0;
  let remindedMatches = 0;

  for (const match of missing) {
    if (alreadyReminded.has(match.id)) {
      skipped += 1;
      continue;
    }
    const recipients = (players.data ?? []).filter(
      (player) =>
        (player.team_id === match.team_a_id || player.team_id === match.team_b_id) &&
        isValidEmail(player.email ?? ""),
    );
    if (recipients.length === 0) {
      skipped += 1;
      continue;
    }

    let matchSent = 0;
    for (const player of recipients) {
      const isTeamA = player.team_id === match.team_a_id;
      const result = await sendTemplateEmail("missing-score-reminder", player.email as string, {
        templateData: {
          weekNo: match.week_no,
          division: match.division,
          court: match.court,
          startTime: match.start_time,
          teamName: nameOf(player.team_id),
          opponentName: nameOf(isTeamA ? match.team_b_id : match.team_a_id),
          submitUrl: `${SITE_URL}/submit`,
          closingEn: settings.closingEn,
          closingSv: settings.closingSv,
          signature: settings.signature,
        },
        idempotencyKey: `auto-score-reminder-${match.id}-${player.email}-${day}-${crypto
          .randomUUID()
          .slice(0, 8)}`,
      });
      if (result.sent) matchSent += 1;
    }

    sent += matchSent;
    remindedMatches += 1;
    const logged = await client
      .from("score_reminders")
      .insert({ match_id: match.id, sent_to: matchSent });
    if (logged.error) console.error("Could not log automatic reminder", logged.error.message);
  }

  return { matches: remindedMatches, sent, skipped };
}
