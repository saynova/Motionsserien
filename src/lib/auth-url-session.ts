import { supabase } from "@/integrations/supabase/client";
import { takeAuthUrlCallback } from "@/lib/auth-url-callback";

let pendingSession: Promise<boolean> | null = null;

/**
 * Completes implicit-token and PKCE redirects before protected-route checks.
 * The callback capture module removes credentials from the address bar before
 * the backend client and React initialize.
 */
export function consumeAuthSessionFromUrl(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (pendingSession) return pendingSession;

  const callback = takeAuthUrlCallback();
  if (!callback) return Promise.resolve(false);

  pendingSession = (async () => {
    if (callback.kind === "error") throw new Error(callback.message);

    const result = callback.kind === "tokens"
      ? await supabase.auth.setSession({
          access_token: callback.accessToken,
          refresh_token: callback.refreshToken,
        })
      : await supabase.auth.exchangeCodeForSession(callback.code);

    if (result.error) throw result.error;
    return Boolean(result.data.session);
  })()
    .finally(() => {
      pendingSession = null;
    });

  return pendingSession;
}