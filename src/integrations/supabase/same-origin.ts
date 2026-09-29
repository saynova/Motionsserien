/**
 * Keeps every browser call to the backend on the site's own domain.
 *
 * Office and school networks often block the backend's cloud subdomain while
 * allowing motionsserien.se, which makes sign-in, account creation and photos
 * fail for those visitors only. Rewriting the address in the browser sends the
 * same request to /api/public/sb/... on this domain, which relays it onwards.
 *
 * Importing this module installs the rewrite. It is a no-op on the server.
 */

const BACKEND_URL = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;

const RELAY_PREFIX = "/api/public/sb/";

function sameOrigin(url: string, backendOrigin: string): string {
  if (!url.startsWith(backendOrigin)) return url;
  const rest = url.slice(backendOrigin.length).replace(/^\/+/, "");
  return `${window.location.origin}${RELAY_PREFIX}${rest}`;
}

function install() {
  if (typeof window === "undefined" || !BACKEND_URL) return;

  let backendOrigin: string;
  try {
    backendOrigin = new URL(BACKEND_URL).origin;
  } catch {
    return;
  }

  // Already relayed (hot reload, double import).
  const flag = "__mssnSameOriginBackend" as const;
  const marked = window as unknown as Record<string, boolean>;
  if (marked[flag]) return;
  marked[flag] = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      if (typeof input === "string") {
        return originalFetch(sameOrigin(input, backendOrigin), init);
      }
      if (input instanceof URL) {
        return originalFetch(sameOrigin(input.toString(), backendOrigin), init);
      }
      if (typeof Request !== "undefined" && input instanceof Request) {
        const rewritten = sameOrigin(input.url, backendOrigin);
        if (rewritten === input.url) return originalFetch(input, init);
        return originalFetch(new Request(rewritten, input), init);
      }
    } catch {
      // Fall through to the untouched request rather than breaking the page.
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}

/**
 * Explicit entry point. Called from the app bootstrap so the rewrite can never
 * be dropped from the production bundle as unused side-effect-only code.
 */
export function initSameOriginRelay(): void {
  install();
}

install();
