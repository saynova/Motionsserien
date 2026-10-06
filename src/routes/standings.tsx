import { createFileRoute } from "@tanstack/react-router";
import { WeeklyBanner } from "@/components/tournament-ui";
import { StandingsPage } from "@/components/standings-page";
import { tournamentQueryOptions } from "@/lib/tournament-query";

const TITLE = "Standings — Motionsserien Badminton tournament";
const DESC = "Live division standings, results and promotion/relegation for the Motionsserien badminton tournament.";

export const Route = createFileRoute("/standings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tournamentQueryOptions),
  component: () => (
    <>
      <WeeklyBanner />
      <StandingsPage />
    </>
  ),
});
