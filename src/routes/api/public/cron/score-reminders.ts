import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { inCronWindow } from "@/lib/cron-windows";

async function hasValidDatabaseToken(request: Request): Promise<boolean> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return false;
  const { adminClient } = await import("@/lib/tournament.server");
  const { data, error } = await adminClient()
    .from("cron_secrets")
    .select("token")
    .eq("name", "score-reminders")
    .maybeSingle();
  if (error || !data?.token) return false;
  return data.token === token;
}

export const Route = createFileRoute("/api/public/cron/score-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized && !(await hasValidDatabaseToken(request))) return unauthorized;

        if (!inCronWindow("reminders")) return Response.json({ ok: true, ran: false, reason: "Outside check window." });
        try {
          const { sendAutomaticScoreReminders } = await import("@/lib/auto-reminders.server");
          const result = await sendAutomaticScoreReminders();
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("Automatic score reminders failed", error);
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
