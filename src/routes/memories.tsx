import { createFileRoute } from "@tanstack/react-router";

import { MemoriesView } from "@/components/memories-view";
import { PageHeader } from "@/components/tournament-ui";
import { memoriesQueryOptions } from "@/lib/tournament-query";

export const Route = createFileRoute("/memories")({
  head: () => ({
    meta: [
      { title: "Champions & Gallery — Motionsserien HT-26 Badminton" },
      {
        name: "description",
        content:
          "The Motionsserien badminton Hall of Fame with every season champion, plus match day photos from the Monday ladder in Ludvika.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Champions & Gallery — Motionsserien HT-26" },
      {
        property: "og:description",
        content: "Season champions and match day photos from the Motionsserien badminton ladder.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(memoriesQueryOptions),
  component: MemoriesPage,
});

function MemoriesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Memories"
        title="Champions & Gallery"
        description="Our Hall of Fame and the best moments from Monday nights in the Rackethall."
      />
      <div className="mt-8">
        <MemoriesView />
      </div>
    </>
  );
}
