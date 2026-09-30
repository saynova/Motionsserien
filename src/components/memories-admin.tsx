import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Camera, Eye, Home, Pin, PinOff, Play, Trash2, Trophy, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { memoriesQueryOptions } from "@/lib/tournament-query";
import { supabase } from "@/integrations/supabase/client";
import {
  addGalleryPhotos,
  createImageUploads,
  deleteChampion,
  deleteGalleryPhoto,
  saveChampion,
  setGalleryPinned,
  setSeasonFinished,
  updateGalleryPhoto,
} from "@/lib/memories.functions";

const control = "w-full rounded border border-input bg-card px-3 py-2 text-sm";

const VIDEO_EXT = ["mp4", "webm", "mov"] as const;

function isVideo(file: File): boolean {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return file.type.startsWith("video/") || (VIDEO_EXT as readonly string[]).includes(ext);
}

function videoExt(file: File): string {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if ((VIDEO_EXT as readonly string[]).includes(ext)) return ext;
  if (file.type.includes("webm")) return "webm";
  if (file.type.includes("quicktime")) return "mov";
  return "mp4";
}

/** Keeps full detail: only very large photos are scaled, and always at top JPEG quality. */
async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`Could not read ${file.name}. Use a JPEG, PNG or WebP photo.`);
  });
  const max = 4000;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process the photo.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the photo."))), "image/jpeg", 0.95),
  );
}

type SlotFn = (args: {
  data: { kind: "champion" | "photo" | "video"; count: number; ext?: string };
}) => Promise<{ slots: { path: string; token: string }[] }>;

async function uploadFiles(files: File[], kind: "champion" | "photo", getSlots: SlotFn) {
  const paths: string[] = [];
  for (const file of files) {
    const video = kind === "photo" && isVideo(file);
    const { slots } = await getSlots({
      data: video
        ? { kind: "video", count: 1, ext: videoExt(file) }
        : { kind, count: 1 },
    });
    const slot = slots[0]!;
    // Videos are uploaded untouched so quality is preserved.
    const blob = video ? file : await prepareImage(file);
    const contentType = video ? file.type || "video/mp4" : "image/jpeg";
    const { error } = await supabase.storage
      .from("gallery")
      .uploadToSignedUrl(slot.path, slot.token, blob, { contentType });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    paths.push(slot.path);
  }
  return paths;
}

export function MemoriesAdmin() {
  const queryClient = useQueryClient();
  const memories = useQuery(memoriesQueryOptions);
  const saveOne = useServerFn(saveChampion);
  const removeChampion = useServerFn(deleteChampion);
  const addPhotos = useServerFn(addGalleryPhotos);
  const updatePhoto = useServerFn(updateGalleryPhoto);
  const removePhoto = useServerFn(deleteGalleryPhoto);
  const pinPhoto = useServerFn(setGalleryPinned);
  const setFinished = useServerFn(setSeasonFinished);
  const getSlots = useServerFn(createImageUploads);

  const [busy, setBusy] = useState(false);
  const [seasonTitle, setSeasonTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState("");
  const [championFile, setChampionFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["memories"] });
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-surface rounded-2xl border border-border p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Home className="h-5 w-5 text-primary" />
          Homepage
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <Switch
            checked={memories.data?.seasonFinished ?? false}
            disabled={busy}
            onCheckedChange={(checked) =>
              run(
                () => setFinished({ data: { finished: checked } }),
                checked
                  ? "Champions & Gallery is now the homepage."
                  : "Current standings are back as the homepage.",
              )
            }
            aria-label="Tournament finished"
          />
          <span className="text-sm">
            Tournament finished — show Champions &amp; Gallery as the homepage
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          While this is on, visitors land on Champions &amp; Gallery; standings stay reachable from
          the menu.
        </p>
      </section>

      <section className="glass-surface rounded-2xl border border-border p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Trophy className="h-5 w-5 text-amber-500" />
          Champion Hall
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Season title
            </span>
            <input
              className={control}
              value={seasonTitle}
              onChange={(event) => setSeasonTitle(event.target.value)}
              placeholder="Motionsserien HT-26"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Year
            </span>
            <input
              className={control}
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Winning team
            </span>
            <input
              className={control}
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Team name"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Players (optional)
            </span>
            <input
              className={control}
              value={players}
              onChange={(event) => setPlayers(event.target.value)}
              placeholder="Player 1 & Player 2"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Team photo
            </span>
            <input
              className={control}
              type="file"
              accept="image/*"
              onChange={(event) => setChampionFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <Button
          className="mt-4"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const imagePath = championFile
                ? ((await uploadFiles([championFile], "champion", getSlots))[0] ?? null)
                : null;
              await saveOne({
                data: { seasonTitle, year, teamName, players, imagePath },
              });
              setSeasonTitle("");
              setTeamName("");
              setPlayers("");
              setChampionFile(null);
            }, "Champion added.")
          }
        >
          <Trophy className="mr-1.5 h-4 w-4" />
          Add champion
        </Button>

        <ul className="mt-5 space-y-2">
          {(memories.data?.champions ?? []).map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3"
            >
              {entry.image_url ? (
                <img
                  src={entry.image_url}
                  alt=""
                  className="h-12 w-12 rounded object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded bg-secondary">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{entry.team_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.season_title} · {entry.year}
                  {entry.players ? ` · ${entry.players}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => run(() => removeChampion({ data: { id: entry.id } }), "Removed.")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-surface rounded-2xl border border-border p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Camera className="h-5 w-5 text-primary" />
          Match day photos &amp; videos
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload high quality photos (JPEG, PNG or WebP) and videos (MP4, WebM or MOV, up to 200 MB
          each), 10 at a time. Newest uploads show first on the page, and anything you pin to the top
          always comes before them.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Caption (optional)
            </span>
            <input
              className={control}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Week 3 · Division 2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Photos or videos
            </span>
            <input
              className={control}
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm,video/quicktime"
              onChange={(event) => setPhotoFiles([...(event.target.files ?? [])])}
            />
          </label>
        </div>
        <Button
          className="mt-4"
          disabled={busy || photoFiles.length === 0}
          onClick={() =>
            run(async () => {
              const paths = await uploadFiles(photoFiles, "photo", getSlots);
              await addPhotos({ data: { caption, paths } });
              setCaption("");
              setPhotoFiles([]);
            }, "Uploaded.")
          }
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Upload
        </Button>

        <ViewStats photos={memories.data?.photos ?? []} />

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(memories.data?.photos ?? []).map((photo) => (
            <li
              key={photo.id}
              className={`rounded-xl border bg-card/60 p-2 ${
                photo.is_pinned ? "border-amber-400 ring-1 ring-amber-400/40" : "border-border"
              }`}
            >
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> {photo.view_count ?? 0} views
              </p>
              {photo.image_url ? (
                photo.media_type === "video" ? (
                  <div className="relative">
                    <video
                      src={photo.image_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-32 w-full rounded bg-black object-cover"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <Play className="h-8 w-8 fill-current text-white/90" />
                    </span>
                  </div>
                ) : (
                  <img
                    src={photo.image_url}
                    alt=""
                    className="h-32 w-full rounded object-cover"
                    loading="lazy"
                  />
                )
              ) : null}
              <input
                className={`${control} mt-2`}
                defaultValue={photo.caption}
                placeholder="Caption"
                onBlur={(event) => {
                  if (event.target.value !== photo.caption) {
                    run(
                      () =>
                        updatePhoto({
                          data: {
                            id: photo.id,
                            caption: event.target.value,
                            sortOrder: photo.sort_order,
                          },
                        }),
                      "Caption saved.",
                    );
                  }
                }}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={photo.is_pinned ? "default" : "outline"}
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => pinPhoto({ data: { id: photo.id, pinned: !photo.is_pinned } }),
                      photo.is_pinned ? "Unpinned." : "Pinned to top.",
                    )
                  }
                >
                  {photo.is_pinned ? (
                    <PinOff className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Pin className="mr-1.5 h-4 w-4" />
                  )}
                  {photo.is_pinned ? "Unpin" : "Pin to top"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => run(() => removePhoto({ data: { id: photo.id } }), "Photo removed.")}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ViewStats({ photos }: { photos: import("@/lib/memories.functions").GalleryPhoto[] }) {
  if (photos.length === 0) return null;
  const total = photos.reduce((n, p) => n + (p.view_count ?? 0), 0);
  const videoViews = photos.filter((p) => p.media_type === "video").reduce((n, p) => n + (p.view_count ?? 0), 0);
  const top = [...photos].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 5);
  const max = Math.max(1, top[0]?.view_count ?? 0);
  return (
    <div className="mt-6 rounded-xl border border-border bg-card/60 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
        <Eye className="h-4 w-4 text-primary" /> Views
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-secondary p-3"><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total views</p></div>
        <div className="rounded-lg bg-secondary p-3"><p className="text-2xl font-bold">{total - videoViews}</p><p className="text-xs text-muted-foreground">Photo views</p></div>
        <div className="rounded-lg bg-secondary p-3"><p className="text-2xl font-bold">{videoViews}</p><p className="text-xs text-muted-foreground">Video views</p></div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Most popular</p>
      <ol className="mt-2 space-y-2">
        {top.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 text-sm">
            <span className="w-4 font-bold">{i + 1}</span>
            {p.media_type === "video" ? (
              <span className="flex h-10 w-14 items-center justify-center rounded bg-secondary"><Play className="h-4 w-4" /></span>
            ) : p.image_url ? (
              <img src={p.image_url} alt="" className="h-10 w-14 rounded object-cover" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate">{p.caption || (p.media_type === "video" ? "Video" : "Photo")}</p>
              <div className="mt-1 h-1.5 rounded bg-secondary"><div className="h-1.5 rounded bg-primary" style={{ width: `${((p.view_count ?? 0) / max) * 100}%` }} /></div>
            </div>
            <span className="font-semibold">{p.view_count ?? 0}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
