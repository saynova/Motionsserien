GRANT SELECT (team_id, player_no, name) ON public.team_players TO anon, authenticated;

CREATE POLICY "Team player names public read"
ON public.team_players
FOR SELECT
TO anon, authenticated
USING (true);