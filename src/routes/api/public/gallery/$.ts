import { createFileRoute } from "@tanstack/react-router";

/**
 * Serves gallery/champion photos from the site's own domain.
 *
 * Some office and school networks block unfamiliar cloud-storage subdomains,
 * so the browser never receives the image when it is fetched directly from
 * storage. Proxying the bytes through this route keeps every image request on
 * motionsserien.se, which those networks already allow.
 */

const SAFE_PATH = /^(champion|photo)-\d+-[a-f0-9]{8}\.jpg$/;

export const Route = createFileRoute("/api/public/gallery/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!SAFE_PATH.test(path)) {
          return new Response("Not found", { status: 404 });
        }

        try {
          const { adminClient } = await import("@/lib/tournament.server");
          const { data, error } = await adminClient().storage.from("gallery").download(path);
          if (error || !data) return new Response("Not found", { status: 404 });

          return new Response(await data.arrayBuffer(), {
            status: 200,
            headers: {
              "content-type": data.type || "image/jpeg",
              // Public, non-personal images: safe to cache in shared caches.
              "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
              "x-content-type-options": "nosniff",
            },
          });
        } catch (error) {
          console.error("Gallery image proxy failed", error);
          return new Response("Image unavailable", { status: 502 });
        }
      },
    },
  },
});
