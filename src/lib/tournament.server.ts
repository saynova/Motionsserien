// Server-only Supabase clients for tournament data.
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

function patchedFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/** Publishable-key client for public reads (RLS applies as anon). */
export function readClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: patchedFetch(key) },
  });
}

/** Service-role client. Only for validated writes inside gated server functions. */
export function adminClient() {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: patchedFetch(key) },
  });
}
