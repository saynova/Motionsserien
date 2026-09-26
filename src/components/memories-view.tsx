import type React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Crown, Trophy, X } from "lucide-react";

import { memoriesQueryOptions } from "@/lib/tournament-query";
import type { ChampionEntry, GalleryPhoto } from "@/lib/memories.functions";

const ROSE_VARIANTS = [
  { outer: "#dc2626", mid: "#ef4444", inner: "#991b1b", core: "#fca5a5", stroke: "#7f1d1d" },
  { outer: "#ffffff", mid: "#f8fafc", inner: "#e2e8f0", core: "#fef9f9", stroke: "#cbd5e1" },
];

function Rose({ variant, size }: { variant: number; size: number }) {
  const c = ROSE_VARIANTS[variant % ROSE_VARIANTS.length]!;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))" }}
    >
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse
          key={`o${a}`}
          cx="20" cy="10.5" rx="6.5" ry="9.5"
          fill={c.outer} stroke={c.stroke} strokeWidth="0.7"
          transform={`rotate(${a} 20 20)`}
        />
      ))}
      {[30, 90, 150, 210, 270, 330].map((a) => (
        <ellipse
          key={`m${a}`}
          cx="20" cy="13" rx="5" ry="7"
          fill={c.mid} stroke={c.stroke} strokeWidth="0.6"
          transform={`rotate(${a} 20 20)`}
        />
      ))}
      {[10, 100, 190, 280].map((a) => (
        <ellipse
          key={`i${a}`}
          cx="20" cy="15.5" rx="3.6" ry="4.8"
          fill={c.inner}
          transform={`rotate(${a} 20 20)`}
        />
      ))}
      <circle cx="20" cy="19" r="2.4" fill={c.core} />
    </svg>
  );
}

function FlowerParade() {
  const [flowers, setFlowers] = useState<
    { left: number; delay: number; duration: number; size: number; sway: number; variant: number }[]
  >([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const count = window.innerWidth < 640 ? 12 : 22;
    setFlowers(
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 7 + Math.random() * 5,
        size: 14 + Math.random() * 14,
        sway: 15 + Math.random() * 40,
        variant: i % ROSE_VARIANTS.length,
      })),
    );
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {flowers.map((f, i) => (
        <span
          key={i}
          className="flower-sway absolute -top-8 block h-full"
          style={
            {
              left: `${f.left}%`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
              "--sway": `${f.sway}px`,
            } as React.CSSProperties
          }
        >
          <Rose variant={f.variant} size={f.size} />
        </span>
      ))}
    </div>
  );
}

function ChampionHero({ entry }: { entry: ChampionEntry }) {
  return (
    <div className="relative mx-auto max-w-4xl pt-4">
      <FlowerParade />
      <div className="champion-drop relative z-10">
        <article className="champion-float relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-2 ring-1 ring-primary/10">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-secondary">
            {entry.image_url ? (
              <img
                src={entry.image_url}
                alt={`${entry.team_name} — ${entry.season_title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Trophy className="h-20 w-20 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/10 to-transparent" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-background/40 bg-background/25 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-background backdrop-blur-md">
              <Crown className="h-3.5 w-3.5" />
              Season Champion
            </span>
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-background/80">
                {entry.season_title} · {entry.year}
              </p>
              <h3 className="mt-1 text-3xl font-black tracking-tight text-background sm:text-5xl">
                {entry.team_name}
              </h3>
              {entry.players ? (
                <p className="mt-2 text-sm font-medium text-background/85 sm:text-base">
                  {entry.players}
                </p>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function PastChampion({ entry }: { entry: ChampionEntry }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {entry.image_url ? (
          <img
            src={entry.image_url}
            alt={`${entry.team_name} — ${entry.season_title}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {entry.season_title} · {entry.year}
        </p>
        <h4 className="mt-1 text-lg font-bold tracking-tight">{entry.team_name}</h4>
        {entry.players ? <p className="text-sm text-muted-foreground">{entry.players}</p> : null}
      </div>
    </article>
  );
}

function weekTag(photo: GalleryPhoto): string {
  const m = /(?:week|vecka|v\.?)\s*(\d{1,2})/i.exec(photo.caption ?? "");
  if (m) return `Week ${m[1]}`;
  return new Date(photo.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Lightbox({
  photos,
  index,
  onClose,
  onIndex,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const photo = photos[index]!;
  const prev = useCallback(
    () => onIndex((index - 1 + photos.length) % photos.length),
    [index, photos.length, onIndex],
  );
  const next = useCallback(() => onIndex((index + 1) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, prev, next]);

  const navBtn =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-background/30 bg-background/15 p-3 text-background backdrop-blur-md transition hover:bg-background/30";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || "Photo"}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-foreground/80 p-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-background/90 p-2 text-foreground shadow"
      >
        <X className="h-5 w-5" />
      </button>
      {photos.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            className={`${navBtn} left-3 sm:left-6`}
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            className={`${navBtn} right-3 sm:right-6`}
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      ) : null}
      <figure
        key={photo.id}
        className="max-h-full w-full max-w-5xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.image_url ? (
          <img
            src={photo.image_url}
            alt={photo.caption || "Match photo"}
            className="max-h-[80vh] w-full rounded-2xl object-contain"
          />
        ) : null}
        <figcaption className="mt-3 flex items-center justify-center gap-3 text-sm text-background">
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
            {weekTag(photo)}
          </span>
          {photo.caption ? <span>{photo.caption}</span> : null}
          <span className="text-background/60">
            {index + 1} / {photos.length}
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

function SectionTitle({ icon, eyebrow, title, sub }: { icon: React.ReactNode; eyebrow: string; title: string; sub: string }) {
  return (
    <header className="text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
        {icon}
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{sub}</p>
    </header>
  );
}

export function MemoriesView() {
  const { data } = useSuspenseQuery(memoriesQueryOptions);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [current, ...past] = data.champions;
  const photos = data.photos;

  return (
    <div className="space-y-16">
      <section>
        <SectionTitle
          icon={<Crown className="h-4 w-4" />}
          eyebrow="Hall of Fame"
          title="Champions"
          sub="Every Motionsserien champion, season by season."
        />
        {!current ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            The first champion will appear here once the season is finished.
          </p>
        ) : (
          <div className="mt-8">
            <ChampionHero entry={current} />
            {past.length > 0 ? (
              <div className="mt-12">
                <h3 className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Past champions
                </h3>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((entry) => (
                    <PastChampion key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          icon={<Camera className="h-4 w-4" />}
          eyebrow="Gallery"
          title="Weekly Photos"
          sub="Match night moments from the Rackethall."
        />
        {photos.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No photos yet. Match day pictures will be published here.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative block overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  {photo.image_url ? (
                    <img
                      src={photo.image_url}
                      alt={photo.caption || "Match photo"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow">
                  {weekTag(photo)}
                </span>
                {photo.caption ? (
                  <span className="block truncate px-3 py-2.5 text-sm font-medium text-muted-foreground">
                    {photo.caption}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {openIndex !== null && photos[openIndex] ? (
        <Lightbox photos={photos} index={openIndex} onClose={() => setOpenIndex(null)} onIndex={setOpenIndex} />
      ) : null}
    </div>
  );
}
