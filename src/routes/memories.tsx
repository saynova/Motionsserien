import { createFileRoute } from "@tanstack/react-router";

import { MemoriesView } from "@/components/memories-view";
import { memoriesQueryOptions } from "@/lib/tournament-query";

export const Route = createFileRoute("/memories")({
  head: () => ({
    meta: [
      { title: "Champions & Gallery — Motionsserien HT-26 Badminton" },
      {
        name: "description",
        content:
          "The Motionsserien badminton Hall of Fame with every season champion, plus match day photos and videos from the Monday ladder in Ludvika.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Champions & Gallery — Motionsserien HT-26" },
      {
        property: "og:description",
        content:
          "Season champions plus match day photos and videos from the Motionsserien badminton ladder.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(memoriesQueryOptions),
  component: MemoriesPage,
});

function MemoriesPage() {
  return (
    <div className="mt-4">
      <MemoriesView />
    </div>
  );
}
