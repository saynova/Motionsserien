import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin relay for the backend API (sign-in, sign-up, password reset and
 * data reads made straight from the browser).
 *
 * Restricted office networks routinely block the backend's own subdomain, which
 * makes account creation and sign-in fail even though the site itself loads.
 * Relaying those calls through motionsserien.se keeps them on a hostname the
 * network already trusts. No extra privilege is granted here: the browser still
 * sends its own publishable key and user token, so row-level security applies
 * exactly as it does for a direct call.
 */

const ALLOWED_PREFIXES = ["auth/v1/", "rest/v1/", "storage/v1/", "functions/v1/"];

// Hop-by-hop and host-specific headers must not be forwarded.
const STRIPPED = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "content-length",
  "cf-connecting-ip",
  "cf-ray",
  "cf-visitor",
  "x-forwarded-host",
]);

const STRIPPED_RESPONSE = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

function forwardHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

async function relay(request: Request, splat: string | undefined): Promise<Response> {
  const path = (splat ?? "").replace(/^\/+/, "");
  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return new Response("Not found", { status: 404 });
  }

  const base = process.env["SUPABASE_URL"];
  if (!base) {
    console.error("Backend relay is missing its address configuration.");
    return new Response("Service unavailable", { status: 503 });
  }

  const incoming = new URL(request.url);
  const target = new URL(`${base.replace(/\/+$/, "")}/${path}`);
  target.search = incoming.search;

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  try {
    const upstream = await fetch(target, {
      method,
      headers: forwardHeaders(request),
      body: hasBody ? await request.arrayBuffer() : null,
      redirect: "manual",
    });

    const headers = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!STRIPPED_RESPONSE.has(key.toLowerCase())) headers.set(key, value);
    });
    // Anything relayed here is request-specific; never let a shared cache keep it.
    headers.set("cache-control", "no-store");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("Backend relay failed", error);
    return new Response("Service unavailable", { status: 502 });
  }
}

export const Route = createFileRoute("/api/public/sb/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => relay(request, params._splat),
      POST: ({ request, params }) => relay(request, params._splat),
      PUT: ({ request, params }) => relay(request, params._splat),
      PATCH: ({ request, params }) => relay(request, params._splat),
      DELETE: ({ request, params }) => relay(request, params._splat),
      HEAD: ({ request, params }) => relay(request, params._splat),
      OPTIONS: ({ request, params }) => relay(request, params._splat),
    },
  },
});
