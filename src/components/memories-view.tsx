import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Camera, Crown, Trophy, X } from "lucide-react";

import { memoriesQueryOptions } from "@/lib/tournament-query";
import type { ChampionEntry, GalleryPhoto } from "@/lib/memories.functions";

function ChampionCard({ entry, featured }: { entry: ChampionEntry; featured: boolean }) {
  return (
    <article
      className={`group glass-surface relative overflow-hidden rounded-2xl border border-border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        featured ? "sm:col-span-2 lg:col-span-2" : ""
      }`}
    >
      <div
        className={`relative w-full overflow-hidden bg-secondary ${featured ? "h-64 sm:h-80" : "h-44"}`}
      >
        {entry.image_url ? (
          <img
            src={entry.image_url}
            alt={`${entry.team_name} — ${entry.season_title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Trophy className="h-12 w-12 text-amber-400" />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-950 shadow">
          <Trophy className="h-3.5 w-3.5" />
          Champion
        </span>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {entry.season_title} · {entry.year}
        </p>
        <h3
          className={`mt-1 font-bold tracking-tight ${featured ? "text-2xl sm:text-3xl" : "text-lg"}`}
        >
          {entry.team_name}
        </h3>
        {entry.players ? (
          <p className="mt-1 text-sm text-muted-foreground">{entry.players}</p>
        ) : null}
      </div>
    </article>
  );
}

function Lightbox({ photo, onClose }: { photo: GalleryPhoto; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || "Photo"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-background/90 p-2 text-foreground shadow"
      >
        <X className="h-5 w-5" />
      </button>
      <figure className="max-h-full w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
        {photo.image_url ? (
          <img
            src={photo.image_url}
            alt={photo.caption || "Match photo"}
            className="max-h-[80vh] w-full rounded-xl object-contain"
          />
        ) : null}
        {photo.caption ? (
          <figcaption className="mt-3 text-center text-sm text-background">
            {photo.caption}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}

export function MemoriesView() {
  const { data } = useSuspenseQuery(memoriesQueryOptions);
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  const champions = data.champions;
  const photos = data.photos;

  return (
    <div className="space-y-12">
      <section>
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-700">
            <Crown className="h-4 w-4" />
            Champion Hall
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Hall of Fame</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Every Motionsserien champion, season by season.
          </p>
        </header>

        {champions.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            The first champion will appear here once the season is finished.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {champions.map((entry, index) => (
              <ChampionCard key={entry.id} entry={entry} featured={index === 0} />
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Camera className="h-4 w-4" />
          Match day photos
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <section>
        {photos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No photos yet. Match day pictures will be published here.
          </p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpen(photo)}
                className="group block w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {photo.image_url ? (
                  <img
                    src={photo.image_url}
                    alt={photo.caption || "Match photo"}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : null}
                {photo.caption ? (
                  <span className="block px-3 py-2 text-sm text-muted-foreground">
                    {photo.caption}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {open ? <Lightbox photo={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
