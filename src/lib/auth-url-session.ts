import { supabase } from "@/integrations/supabase/client";

let pendingSession: Promise<boolean> | null = null;

/**
 * Completes implicit auth redirects before protected-route checks run.
 * The credentials are removed from the address bar synchronously so they are
 * never left visible if session establishment is delayed or fails.
 */
export function consumeAuthSessionFromUrl(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (pendingSession) return pendingSession;

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return Promise.resolve(false);

  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);

  pendingSession = supabase.auth
    .setSession({ access_token: accessToken, refresh_token: refreshToken })
    .then(({ data, error }) => {
      if (error) throw error;
      return Boolean(data.session);
    })
    .finally(() => {
      pendingSession = null;
    });

  return pendingSession;
}