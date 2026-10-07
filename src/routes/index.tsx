import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { StandingsPage } from "@/components/standings-page";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarRange, Crown, Layers3, Lock, ScrollText, Send, Trophy, Users, X } from "lucide-react";


import { MovementBadge, PageHeader, ScoreText, StatusPill, WeeklyBanner } from "@/components/tournament-ui";
import { Button } from "@/components/ui/button";
import {
  computeStandings,
  courtForDivision,
  formatWeekDate,
  sessionForDivision,
} from "@/lib/tournament";
import { memoriesQueryOptions, tournamentQueryOptions } from "@/lib/tournament-query";
import { MemoriesView } from "@/components/memories-view";
import { TeamDetailsDialog } from "@/components/team-details-dialog";
import { brandingQueryOptions, DEFAULT_BRANDING } from "@/lib/branding.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Motionsserien Badminton tournament- Organized by Hitachi IF and Ludvika Badminton Club",
      },
      {
        name: "description",
        content:
          "Live division standings for the Motionsserien HT-26 badminton tournament, featuring promotion and relegation across all 10 divisions, organized by Hitachi IF and Ludvika Badminton Club. For inquiries, contact the General: Md Rabiul Islam",
      },
      {
        name: "keywords",
        content:
          "Motionsserien standings, Motionsserien HT-26, badminton Ludvika, Hitachi IF badminton, Ludvika Badmintonklubb, badminton division standings, badmintonstege, motionsserie badminton, badminton resultat, Rackethallen Ludvika, badminton Dalarna, promotion and relegation badminton",
      },
      {
        property: "og:title",
        content:
          "Motionsserien Badminton tournament- Organized by Hitachi IF and Ludvika Badminton Club",
      },
      {
        property: "og:description",
        content:
          "Live division standings for the Motionsserien HT-26 badminton tournament, featuring promotion and relegation across all 10 divisions, organized by Hitachi IF and Ludvika Badminton Club.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.motionsserien.se/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.motionsserien.se/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: "Motionsserien",
          sport: "Badminton",
          url: "https://www.motionsserien.se/",
          description:
            "Live division standings for the Motionsserien badminton tournament, featuring promotion and relegation across all 10 divisions, organized by Hitachi IF and Ludvika Badminton Club. For inquiries, contact the General: Md Rabiul Islam",
          startDate: "2026-09-07T19:00:00+02:00",
          endDate: "2026-11-09T22:00:00+01:00",
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          eventSchedule: {
            "@type": "Schedule",
            byDay: "https://schema.org/Monday",
            repeatFrequency: "P1W",
          },
          location: {
            "@type": "Place",
            name: "Rackethallen Ludvika",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Ludvika",
              addressRegion: "Dalarna",
              addressCountry: "SE",
            },
          },
          organizer: [
            { "@type": "SportsOrganization", name: "Hitachi IF" },
            { "@type": "SportsOrganization", name: "Ludvika Badminton Club" },
          ],
        }),
      },
    ],
  }),

  loader: async ({ context }) => {
    const [, memories] = await Promise.all([
      context.queryClient.ensureQueryData(tournamentQueryOptions),
      context.queryClient.ensureQueryData(memoriesQueryOptions),
    ]);
    if (memories.homepage === "schedule") throw redirect({ to: "/schedule", search: { week: undefined, court: undefined, division: undefined, team: undefined } });
    if (memories.homepage === "register") throw redirect({ to: "/register" });
    if (memories.homepage === "one-day") throw redirect({ to: "/one-day" });
  },
  errorComponent: ({ error }) => <p role="alert">Could not load the standings: {error instanceof Error ? error.message : String(error)}</p>,
  notFoundComponent: () => <p>Standings were not found.</p>,
  component: HomePage,
});

function HomePage() {
  const memories = useSuspenseQuery(memoriesQueryOptions);
  if (memories.data.seasonFinished) {
    return (
      <>
        <WeeklyBanner />
        <div className="mt-8">

          <MemoriesView />
        </div>
      </>
    );
  }
  return (
    <>
      <WeeklyBanner />
      <StandingsPage />
    </>
  );
}
