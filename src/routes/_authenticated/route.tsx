import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthSessionFromUrl } from "@/lib/auth-url-session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // The browser owns the persisted session. Never reject an auth callback
    // during server route discovery, before its URL credentials can be used.
    if (typeof window === "undefined") return;
    await consumeAuthSessionFromUrl();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
