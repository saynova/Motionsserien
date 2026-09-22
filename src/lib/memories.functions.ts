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

const SIGNED_URL_SECONDS = 60 * 60 * 12;

async function signedUrlMap(
  client: {
    storage: {
      from: (bucket: string) => {
        createSignedUrls: (
          paths: string[],
          expiresIn: number,
        ) => Promise<{ data: { path?: string | null; signedUrl: string }[] | null; error: unknown }>;
      };
    };
  },
  paths: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p) => p.length > 0))];
  if (unique.length === 0) return {};
  const { data, error } = await client.storage.from("gallery").createSignedUrls(
    unique,
    SIGNED_URL_SECONDS,
  );
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const row of data) {
    if (row.path) out[row.path] = row.signedUrl;
  }
  return out;
}

export const getMemories = createServerFn({ method: "GET" }).handler(
  async (): Promise<MemoriesData> => {
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

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

    const urls = await signedUrlMap(client, [
      ...(champions.data ?? []).map((c) => c.image_path ?? ""),
      ...(photos.data ?? []).map((p) => p.image_path),
    ]);

    return {
      seasonFinished: settings.data?.season_finished === true,
      champions: (champions.data ?? []).map((c) => ({
        ...c,
        image_url: c.image_path ? (urls[c.image_path] ?? null) : null,
      })) as ChampionEntry[],
      photos: (photos.data ?? []).map((p) => ({
        ...p,
        image_url: urls[p.image_path] ?? null,
      })) as GalleryPhoto[],
    };
  },
);

type ImageInput = { base64: string; mimeType: string } | null | undefined;

function validateImage(image: ImageInput) {
  if (!image) return null;
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(image.mimeType)) {
    throw new Error("Use a PNG, JPEG or WebP image.");
  }
  if (image.base64.length > 9_500_000) {
    throw new Error("Each photo must be smaller than 7 MB.");
  }
  return image;
}

function extensionFor(mimeType: string) {
  return mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
}

async function uploadImage(
  client: ReturnType<typeof import("./tournament.server").adminClient>,
  image: { base64: string; mimeType: string },
  prefix: string,
) {
  const path = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extensionFor(image.mimeType)}`;
  const bytes = Uint8Array.from(atob(image.base64), (character) => character.charCodeAt(0));
  const uploaded = await client.storage.from("gallery").upload(path, bytes, {
    contentType: image.mimeType,
    upsert: false,
  });
  if (uploaded.error) throw new Error(uploaded.error.message);
  return path;
}

// ------------------------------------------------------------ champion hall

type ChampionInput = {
  id?: string;
  seasonTitle: string;
  year: number;
  teamName: string;
  players: string;
  image?: { base64: string; mimeType: string } | null;
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
    validateImage(data?.image);
    return {
      id: typeof data?.id === "string" && data.id.length > 10 ? data.id : null,
      seasonTitle,
      year,
      teamName,
      players,
      image: data?.image ?? null,
    };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    let imagePath: string | null = null;
    if (data.image) imagePath = await uploadImage(client, data.image, "champion");

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
  .inputValidator((data: { caption: string; images: { base64: string; mimeType: string }[] }) => {
    const caption = (data?.caption ?? "").trim().slice(0, 160);
    const images = Array.isArray(data?.images) ? data.images : [];
    if (images.length === 0) throw new Error("Choose at least one photo.");
    if (images.length > 6) throw new Error("Upload at most 6 photos at a time.");
    for (const image of images) validateImage(image);
    return { caption, images };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    for (const image of data.images) {
      const path = await uploadImage(client, image, "photo");
      const { error } = await client
        .from("gallery_photos")
        .insert({ caption: data.caption, image_path: path });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const, added: data.images.length };
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
