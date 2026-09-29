import { createFileRoute } from "@tanstack/react-router";

/**
 * Serves gallery photos, videos and champion pictures from the site's own domain.
 *
 * Some office and school networks block unfamiliar cloud-storage subdomains,
 * so the browser never receives the file when it is fetched directly from
 * storage. Proxying the bytes through this route keeps every media request on
 * motionsserien.se, which those networks already allow.
 */

const SAFE_PATH = /^(?:champion|photo)-\d+-[a-f0-9]{8}\.jpg$|^video-\d+-[a-f0-9]{8}\.(?:mp4|webm|mov)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export const Route = createFileRoute("/api/public/gallery/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = params._splat ?? "";
        if (!SAFE_PATH.test(path)) {
          return new Response("Not found", { status: 404 });
        }

        const ext = path.split(".").pop() ?? "jpg";
        const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

        try {
          const { adminClient } = await import("@/lib/tournament.server");
          const { data, error } = await adminClient().storage.from("gallery").download(path);
          if (error || !data) return new Response("Not found", { status: 404 });

          const headers: Record<string, string> = {
            "content-type": contentType,
            // Public, non-personal media: safe to cache in shared caches.
            "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
            "x-content-type-options": "nosniff",
            "accept-ranges": "bytes",
          };

          // Video players ask for byte ranges so viewers can seek.
          const range = request.headers.get("range");
          const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
          if (match) {
            const total = data.size;
            const start = match[1] ? Number(match[1]) : 0;
            const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
            if (Number.isFinite(start) && start <= end && start < total) {
              const slice = data.slice(start, end + 1);
              return new Response(await slice.arrayBuffer(), {
                status: 206,
                headers: {
                  ...headers,
                  "content-range": `bytes ${start}-${end}/${total}`,
                  "content-length": String(end - start + 1),
                },
              });
            }
          }

          return new Response(await data.arrayBuffer(), { status: 200, headers });
        } catch (error) {
          console.error("Gallery media proxy failed", error);
          return new Response("Media unavailable", { status: 502 });
        }
      },
    },
  },
});
