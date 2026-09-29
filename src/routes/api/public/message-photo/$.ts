import { createFileRoute } from "@tanstack/react-router";

/**
 * Serves a photo attached to an "Ask the General" message.
 *
 * Only a signed-in admin may read it: attachments can contain private details,
 * so the file never becomes publicly reachable. The bytes are proxied through
 * this site's own address because restricted office networks block unfamiliar
 * storage subdomains.
 */

const SAFE_PATH = /^msg-\d+-[a-f0-9]{8}\.(?:jpg|png|webp)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const Route = createFileRoute("/api/public/message-photo/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!SAFE_PATH.test(path)) return new Response("Not found", { status: 404 });

        try {
          const { requireAdmin } = await import("@/lib/admin-session.server");
          await requireAdmin();
        } catch {
          return new Response("Admin sign-in required", { status: 403 });
        }

        try {
          const { adminClient } = await import("@/lib/tournament.server");
          const { data, error } = await adminClient()
            .storage.from("message-attachments")
            .download(path);
          if (error || !data) return new Response("Not found", { status: 404 });

          const ext = path.split(".").pop() ?? "jpg";
          return new Response(await data.arrayBuffer(), {
            status: 200,
            headers: {
              "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream",
              "cache-control": "private, max-age=300",
              "x-content-type-options": "nosniff",
            },
          });
        } catch (error) {
          console.error("Message attachment proxy failed", error);
          return new Response("Photo unavailable", { status: 502 });
        }
      },
    },
  },
});
