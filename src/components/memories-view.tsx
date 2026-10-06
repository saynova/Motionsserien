import type React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Crown, Download, Film, Image as ImageIcon, Play, Share2, Sparkles, Star, Trophy, X } from "lucide-react";

import { memoriesQueryOptions } from "@/lib/tournament-query";
import { recordGalleryView, type ChampionEntry, type GalleryPhoto } from "@/lib/memories.functions";

function ChampionHero({ entry }: { entry: ChampionEntry }) {
  return (
    <div className="relative mx-auto max-w-4xl pt-4">
      <article className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-2 ring-1 ring-primary/10">
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
  );
}

function PastChampion({ entry }: { entry: ChampionEntry }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-background/20 bg-foreground/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-background backdrop-blur-md">
          <Trophy className="h-3.5 w-3.5 text-[#f5c542]" /> Champions · {entry.year}
        </span>
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

function weekNumber(photo: GalleryPhoto): number | null {
  const m = /(?:week|vecka|v\.?)\s*(\d{1,2})/i.exec(photo.caption ?? "");
  return m ? Number(m[1]) : null;
}

function weekTag(photo: GalleryPhoto): string {
  const n = weekNumber(photo);
  if (n !== null) return `Week ${n}`;
  return new Date(photo.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function dateLabel(photo: GalleryPhoto): string {
  return new Date(photo.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  const stripRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

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

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>(`[data-strip-index="${index}"]`);
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index]);

  const navBtn =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-background/30 bg-background/15 p-3 text-background backdrop-blur-md transition hover:bg-background/30";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || (photo.media_type === "video" ? "Video" : "Photo")}
      className="fixed inset-0 z-50 flex animate-fade-in flex-col items-center justify-center bg-foreground/85 p-4 backdrop-blur-xl"
      onClick={onClose}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        touchX.current = null;
        if (start === null || end === null) return;
        const dx = end - start;
        if (Math.abs(dx) < 50 || photos.length < 2) return;
        if (dx > 0) prev();
        else next();
      }}
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
            aria-label="Previous"
            className={`${navBtn} left-3 hidden sm:left-6 sm:block`}
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Next"
            className={`${navBtn} right-3 hidden sm:right-6 sm:block`}
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
        className="w-full max-w-5xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.image_url ? (
          photo.media_type === "video" ? (
            <video
              src={photo.image_url}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="max-h-[68vh] w-full rounded-2xl bg-black object-contain"
            />
          ) : (
            <img
              src={photo.image_url}
              alt={photo.caption || "Match photo"}
              className="max-h-[68vh] w-full rounded-2xl object-contain"
            />
          )
        ) : null}
        <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-background">
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
            {weekTag(photo)}
          </span>
          {photo.caption ? <span className="font-medium">{photo.caption}</span> : null}
          <span className="text-background/70">{dateLabel(photo)}</span>
          <span className="text-background/60">
            {index + 1} / {photos.length}
          </span>
          {photo.image_url ? (
            <span className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const url = photo.image_url!;
                  try {
                    if (navigator.share) await navigator.share({ title: photo.caption || "Motionsserien", url });
                    else {
                      await navigator.clipboard.writeText(url);
                      alert("Link copied");
                    }
                  } catch {
                    /* cancelled */
                  }
                }}
                className="inline-flex items-center gap-1 rounded-full border border-background/30 bg-background/15 px-3 py-1 text-xs font-semibold backdrop-blur-md hover:bg-background/30"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
              <a
                href={photo.image_url}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-background/30 bg-background/15 px-3 py-1 text-xs font-semibold backdrop-blur-md hover:bg-background/30"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </span>
          ) : null}
        </figcaption>
      </figure>

      {photos.length > 1 ? (
        <div
          ref={stripRef}
          className="mt-4 flex w-full max-w-5xl gap-2 overflow-x-auto pb-1"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              data-strip-index={i}
              aria-label={`Open ${p.caption || "media"} ${i + 1}`}
              onClick={() => onIndex(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === index
                  ? "border-primary opacity-100"
                  : "border-background/20 opacity-60 hover:opacity-100"
              }`}
            >
              {p.image_url ? (
                p.media_type === "video" ? (
                  <video src={p.image_url} muted playsInline preload="metadata" className="h-full w-full bg-black object-cover" />
                ) : (
                  <img src={p.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                )
              ) : null}
              {p.media_type === "video" ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <Play className="h-4 w-4 fill-current text-background drop-shadow" />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({
  icon,
  eyebrow,
  title,
  sub,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title?: string;
  sub?: string;
}) {
  return (
    <header className="text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
        {icon}
        {eyebrow}
      </span>
      {title ? <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2> : null}
      {sub ? <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{sub}</p> : null}
    </header>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
      {typeof count === "number" ? (
        <span className={active ? "text-primary-foreground/80" : "text-muted-foreground/70"}>{count}</span>
      ) : null}
    </button>
  );
}

function MediaCard({
  photo,
  onOpen,
  featured,
}: {
  photo: GalleryPhoto;
  onOpen: () => void;
  featured?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative block w-full overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        featured ? "border-[#d4a017]/50 ring-1 ring-[#d4a017]/25" : "border-border"
      }`}
    >
      <div className={`relative overflow-hidden bg-secondary ${loaded ? "" : "min-h-48 animate-pulse"}`}>
        {photo.image_url ? (
          photo.media_type === "video" ? (
            <video
              src={photo.image_url}
              muted
              playsInline
              preload="metadata"
              onLoadedData={() => setLoaded(true)}
              className="block w-full bg-black object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <img
              src={photo.image_url}
              alt={photo.caption || "Match photo"}
              onLoad={() => setLoaded(true)}
              className={`block w-full transition-all duration-500 group-hover:scale-[1.04] ${loaded ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}
              loading="lazy"
              decoding="async"
            />
          )
        ) : null}
      </div>

      {photo.media_type === "video" ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-background/40 bg-foreground/45 text-background backdrop-blur-md transition duration-300 group-hover:scale-110">
            <Play className="ml-0.5 h-6 w-6 fill-current" />
          </span>
        </span>
      ) : null}

      <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow">
        {weekTag(photo)}
      </span>

      {photo.is_pinned ? (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#d4a017] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-background shadow">
          <Star className="h-3 w-3 fill-current" aria-hidden />
          Featured
        </span>
      ) : null}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-3 flex-col gap-0.5 bg-gradient-to-t from-foreground/85 via-foreground/35 to-transparent px-3.5 pb-3 pt-10 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        {photo.caption ? (
          <span className={`font-semibold text-background ${featured ? "text-base" : "text-sm"}`}>
            {photo.caption}
          </span>
        ) : null}
        <span className="text-[11px] font-medium uppercase tracking-wide text-background/80">
          {photo.media_type === "video" ? "Video" : "Photo"} · {dateLabel(photo)}
        </span>
      </span>
    </button>
  );
}

type MediaFilter = "all" | "photo" | "video";

export function MemoriesView() {
  const { data } = useSuspenseQuery(memoriesQueryOptions);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [page, setPage] = useState(0);

  const [current, ...past] = data.champions;
  const allPhotos = data.photos;

  const counts = useMemo(() => {
    let video = 0;
    for (const p of allPhotos) if (p.media_type === "video") video += 1;
    return { all: allPhotos.length, video, photo: allPhotos.length - video };
  }, [allPhotos]);

  const photos = useMemo(
    () =>
      allPhotos.filter((p) => {
        if (mediaFilter === "video" && p.media_type !== "video") return false;
        if (mediaFilter === "photo" && p.media_type === "video") return false;
        return true;
      }),
    [allPhotos, mediaFilter],
  );

  const PER_PAGE = 24;
  const pageCount = Math.max(1, Math.ceil(photos.length / PER_PAGE));
  const pagedPhotos = useMemo(
    () => photos.slice(page * PER_PAGE, (page + 1) * PER_PAGE),
    [photos, page],
  );

  useEffect(() => {
    setOpenIndex(null);
    setPage(0);
  }, [mediaFilter]);

  const viewed = useRef(new Set<string>());
  useEffect(() => {
    if (openIndex === null) return;
    const item = photos[openIndex];
    if (!item || viewed.current.has(item.id)) return;
    viewed.current.add(item.id);
    recordGalleryView({ data: { id: item.id } }).catch(() => {});
  }, [openIndex, photos]);



  return (
    <div className="space-y-16">
      <section>
        <SectionTitle
          icon={
            <span className="inline-flex items-center gap-1.5">
              <Trophy
                className="h-4 w-4 text-[#d4a017] drop-shadow-[0_1px_2px_rgba(180,120,0,0.45)]"
                strokeWidth={2.25}
                aria-hidden
              />
            </span>
          }
          eyebrow="Hall of Fame"
          title="Champions"
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
        <SectionTitle icon={<Camera className="h-4 w-4" />} eyebrow="Gallery" />


        {allPhotos.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nothing here yet. Match day photos and videos will be published here.
          </p>
        ) : (
          <>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              <FilterPill active={mediaFilter === "all"} onClick={() => setMediaFilter("all")} count={counts.all}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                All moments
              </FilterPill>
              <FilterPill active={mediaFilter === "photo"} onClick={() => setMediaFilter("photo")} count={counts.photo}>
                <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                Photos
              </FilterPill>
              <FilterPill active={mediaFilter === "video"} onClick={() => setMediaFilter("video")} count={counts.video}>
                <Film className="h-3.5 w-3.5" aria-hidden />
                Videos
              </FilterPill>
            </div>


            {photos.length === 0 ? (
              <p className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Nothing matches this filter yet. Try another media type.
              </p>
            ) : (
              <div className="mt-8 columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
                {pagedPhotos.map((photo, i) => (
                  <MediaCard
                    key={photo.id}
                    photo={photo}
                    featured={photo.is_pinned}
                    onOpen={() => setOpenIndex(page * PER_PAGE + i)}
                  />
                ))}
              </div>
            )}

            {pageCount > 1 ? (
              <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Gallery pages">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-full border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                {Array.from({ length: pageCount }, (_, p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`h-9 w-9 rounded-full border text-xs font-bold transition ${
                      p === page
                        ? "border-primary bg-primary text-primary-foreground shadow"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {p + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="rounded-full border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            ) : null}

          </>

        )}
      </section>

      {openIndex !== null && photos[openIndex] ? (
        <Lightbox photos={photos} index={openIndex} onClose={() => setOpenIndex(null)} onIndex={setOpenIndex} />
      ) : null}
    </div>
  );
}
