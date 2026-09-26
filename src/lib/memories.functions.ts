import { createServerFn } from "@tanstack/react-start";

export type ChampionEntry = {
  id: string;
  season_title: string;
  year: number;
  team_name: string;
  players: string;
  image_path: string | null;
  image_url: string | null;
  sort_order: number;
};

export type GalleryPhoto = {
  id: string;
  caption: string;
  image_path: string;
  image_url: string | null;
  sort_order: number;
  created_at: string;
};

export type MemoriesData = {
  seasonFinished: boolean;
  champions: ChampionEntry[];
  photos: GalleryPhoto[];
};

/**
 * Photos are served from this site's own domain rather than straight from cloud
 * storage: restricted office networks block unfamiliar storage subdomains, so a
 * direct link leaves visitors staring at empty image frames.
 */
function galleryUrl(path: string | null | undefined): string | null {
  if (typeof path !== "string" || path.length === 0) return null;
  return `/api/public/gallery/${path}`;
}


export const getMemories = createServerFn({ method: "GET" }).handler(
  async (): Promise<MemoriesData> => {
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    try {
    const [settings, champions, photos] = await Promise.all([
      client
        .from("site_support_settings")
        .select("season_finished")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      client
        .from("champions")
        .select("id, season_title, year, team_name, players, image_path, sort_order")
        .order("year", { ascending: false })
        .order("sort_order", { ascending: true }),
      client
        .from("gallery_photos")
        .select("id, caption, image_path, sort_order, created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);
    if (champions.error) throw new Error(champions.error.message);
    if (photos.error) throw new Error(photos.error.message);

    return {
      seasonFinished: settings.data?.season_finished === true,
      champions: (champions.data ?? []).map((c) => ({
        ...c,
        image_url: galleryUrl(c.image_path),
      })) as ChampionEntry[],
      photos: (photos.data ?? []).map((p) => ({
        ...p,
        image_url: galleryUrl(p.image_path),
      })) as GalleryPhoto[],

    };
    } catch {
      // Backend hiccup (e.g. transient token/clock rejection): never blank the
      // homepage — fall back to the normal standings view with empty memories.
      return { seasonFinished: false, champions: [], photos: [] };
    }
  },
);

function validPath(path: unknown, prefix: string): string | null {
  if (typeof path !== "string" || path.length === 0) return null;
  if (!new RegExp(`^${prefix}-\\d+-[a-f0-9]{8}\\.jpg$`).test(path)) {
    throw new Error("Invalid photo reference. Please upload again.");
  }
  return path;
}

async function assertUploaded(
  client: ReturnType<typeof import("./tournament.server").adminClient>,
  path: string,
) {
  const { data, error } = await client.storage.from("gallery").createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error("The photo did not finish uploading. Please try again.");
}

/** Gives the admin browser one-time direct upload slots (avoids request size limits). */
export const createImageUploads = createServerFn({ method: "POST" })
  .inputValidator((data: { kind: "champion" | "photo"; count: number }) => {
    const kind = data?.kind === "champion" ? "champion" : "photo";
    const count = Math.max(1, Math.min(10, Math.trunc(Number(data?.count) || 1)));
    return { kind, count };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();
    const slots: { path: string; token: string }[] = [];
    for (let i = 0; i < data.count; i++) {
      const path = `${data.kind}-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}.jpg`;
      const { data: signed, error } = await client.storage
        .from("gallery")
        .createSignedUploadUrl(path);
      if (error || !signed) throw new Error(error?.message ?? "Could not prepare upload.");
      slots.push({ path, token: signed.token });
    }
    return { slots };
  });

// ------------------------------------------------------------ champion hall

type ChampionInput = {
  id?: string;
  seasonTitle: string;
  year: number;
  teamName: string;
  players: string;
  imagePath?: string | null;
};

export const saveChampion = createServerFn({ method: "POST" })
  .inputValidator((data: ChampionInput) => {
    const seasonTitle = (data?.seasonTitle ?? "").trim().slice(0, 120);
    const teamName = (data?.teamName ?? "").trim().slice(0, 120);
    const players = (data?.players ?? "").trim().slice(0, 200);
    const year = Number(data?.year);
    if (seasonTitle.length < 2) throw new Error("Add a season title (for example HT-26).");
    if (teamName.length < 2) throw new Error("Add the winning team name.");
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("Enter a valid year.");
    const imagePath = validPath(data?.imagePath, "champion");
    return {
      id: typeof data?.id === "string" && data.id.length > 10 ? data.id : null,
      seasonTitle,
      year,
      teamName,
      players,
      imagePath,
    };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    const imagePath = data.imagePath;
    if (imagePath) await assertUploaded(client, imagePath);

    if (data.id) {
      const existing = await client
        .from("champions")
        .select("image_path")
        .eq("id", data.id)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      if (imagePath && existing.data?.image_path) {
        await client.storage.from("gallery").remove([existing.data.image_path]);
      }
      const { error } = await client
        .from("champions")
        .update({
          season_title: data.seasonTitle,
          year: data.year,
          team_name: data.teamName,
          players: data.players,
          ...(imagePath ? { image_path: imagePath } : {}),
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await client.from("champions").insert({
        season_title: data.seasonTitle,
        year: data.year,
        team_name: data.teamName,
        players: data.players,
        image_path: imagePath,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteChampion = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (typeof data?.id !== "string" || data.id.length < 10) throw new Error("Entry is required.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();
    const existing = await client
      .from("champions")
      .select("image_path")
      .eq("id", data.id)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.image_path) {
      await client.storage.from("gallery").remove([existing.data.image_path]);
    }
    const { error } = await client.from("champions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------------------------------------------------------------- gallery

export const addGalleryPhotos = createServerFn({ method: "POST" })
  .inputValidator((data: { caption: string; paths: string[] }) => {
    const caption = (data?.caption ?? "").trim().slice(0, 160);
    const raw = Array.isArray(data?.paths) ? data.paths : [];
    if (raw.length === 0) throw new Error("Choose at least one photo.");
    if (raw.length > 10) throw new Error("Upload at most 10 photos at a time.");
    const paths = raw.map((p) => validPath(p, "photo") as string);
    return { caption, paths };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    for (const path of data.paths) {
      await assertUploaded(client, path);
      const { error } = await client
        .from("gallery_photos")
        .insert({ caption: data.caption, image_path: path });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const, added: data.paths.length };
  });

export const updateGalleryPhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; caption: string; sortOrder: number }) => {
    if (typeof data?.id !== "string" || data.id.length < 10) throw new Error("Photo is required.");
    const sortOrder = Number(data?.sortOrder ?? 0);
    return {
      id: data.id,
      caption: (data?.caption ?? "").trim().slice(0, 160),
      sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
    };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient()
      .from("gallery_photos")
      .update({ caption: data.caption, sort_order: data.sortOrder })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (typeof data?.id !== "string" || data.id.length < 10) throw new Error("Photo is required.");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();
    const existing = await client
      .from("gallery_photos")
      .select("image_path")
      .eq("id", data.id)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.image_path) {
      await client.storage.from("gallery").remove([existing.data.image_path]);
    }
    const { error } = await client.from("gallery_photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// --------------------------------------------------------- homepage switch

export const setSeasonFinished = createServerFn({ method: "POST" })
  .inputValidator((data: { finished: boolean }) => ({ finished: data?.finished === true }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();
    const existing = await client
      .from("site_support_settings")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    const result = existing.data
      ? await client
          .from("site_support_settings")
          .update({ season_finished: data.finished })
          .eq("id", existing.data.id)
      : await client.from("site_support_settings").insert({ season_finished: data.finished });
    if (result.error) throw new Error(result.error.message);
    return { ok: true as const };
  });
