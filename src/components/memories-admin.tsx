import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Camera, Home, Trash2, Trophy, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { memoriesQueryOptions } from "@/lib/tournament-query";
import {
  addGalleryPhotos,
  deleteChampion,
  deleteGalleryPhoto,
  saveChampion,
  setSeasonFinished,
  updateGalleryPhoto,
} from "@/lib/memories.functions";

const control = "w-full rounded border border-input bg-card px-3 py-2 text-sm";

async function readFiles(files: File[]) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Could not read the file."));
          reader.onload = () => {
            const result = String(reader.result ?? "");
            resolve({ base64: result.split(",")[1] ?? "", mimeType: file.type });
          };
          reader.readAsDataURL(file);
        }),
    ),
  );
}

export function MemoriesAdmin() {
  const queryClient = useQueryClient();
  const memories = useQuery(memoriesQueryOptions);
  const saveOne = useServerFn(saveChampion);
  const removeChampion = useServerFn(deleteChampion);
  const addPhotos = useServerFn(addGalleryPhotos);
  const updatePhoto = useServerFn(updateGalleryPhoto);
  const removePhoto = useServerFn(deleteGalleryPhoto);
  const setFinished = useServerFn(setSeasonFinished);

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
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setChampionFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <Button
          className="mt-4"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const image = championFile ? ((await readFiles([championFile]))[0] ?? null) : null;
              await saveOne({
                data: { seasonTitle, year, teamName, players, image },
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
          Match day photos
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload high quality photos (JPEG, PNG or WebP, up to 7 MB each, 6 at a time).
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
              Photos
            </span>
            <input
              className={control}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setPhotoFiles([...(event.target.files ?? [])])}
            />
          </label>
        </div>
        <Button
          className="mt-4"
          disabled={busy || photoFiles.length === 0}
          onClick={() =>
            run(async () => {
              const images = await readFiles(photoFiles);
              await addPhotos({ data: { caption, images } });
              setCaption("");
              setPhotoFiles([]);
            }, "Photos uploaded.")
          }
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Upload photos
        </Button>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(memories.data?.photos ?? []).map((photo) => (
            <li key={photo.id} className="rounded-xl border border-border bg-card/60 p-2">
              {photo.image_url ? (
                <img
                  src={photo.image_url}
                  alt=""
                  className="h-32 w-full rounded object-cover"
                  loading="lazy"
                />
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
              <Button
                className="mt-2 w-full"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => run(() => removePhoto({ data: { id: photo.id } }), "Photo removed.")}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
