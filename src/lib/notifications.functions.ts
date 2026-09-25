import { createServerFn } from "@tanstack/react-start";

export type AdminNotification = {
  id: string;
  kind: "question" | "score" | "shuttle" | "registration" | "champion" | "photo";
  title: string;
  detail: string;
  at: string;
  section: string;
};

export const getAdminNotifications = createServerFn({ method: "POST" }).handler(
  async (): Promise<AdminNotification[]> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [messages, scores, shuttles, regs, teams, champs, photos] = await Promise.all([
      client
        .from("messages")
        .select("id, name, email, topic, created_at")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("matches")
        .select("id, week_no, division, team_a_id, team_b_id, submitted_by, submitted_at")
        .eq("status", "pending")
        .order("submitted_at", { ascending: false })
        .limit(40),
      client
        .from("shuttle_orders")
        .select("id, team_name, buyer_name, quantity, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("registrations")
        .select("id, team_name, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(30),
      client.from("teams").select("id, name"),
      client.from("champions").select("id, team_name, season_title, created_at").gte("created_at", since).limit(20),
      client.from("gallery_photos").select("id, caption, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    ]);

    const teamName = (id: string) => teams.data?.find((t) => t.id === id)?.name ?? "Team";
    const out: AdminNotification[] = [];

    for (const m of messages.data ?? []) {
      out.push({
        id: `q-${m.id}`,
        kind: "question",
        title: `New ${m.topic} from ${m.name || m.email}`,
        detail: "Waiting for your reply",
        at: m.created_at,
        section: "messages",
      });
    }
    for (const s of scores.data ?? []) {
      out.push({
        id: `s-${s.id}`,
        kind: "score",
        title: `Score submitted · Div ${s.division}, week ${s.week_no}`,
        detail: `${teamName(s.team_a_id)} vs ${teamName(s.team_b_id)}${s.submitted_by ? ` · by ${s.submitted_by}` : ""}`,
        at: s.submitted_at ?? new Date(0).toISOString(),
        section: "matches",
      });
    }
    for (const o of shuttles.data ?? []) {
      out.push({
        id: `o-${o.id}`,
        kind: "shuttle",
        title: `Shuttle order · ${o.team_name}`,
        detail: `${o.quantity} box · ${o.buyer_name}`,
        at: o.created_at,
        section: "shuttles",
      });
    }
    for (const r of regs.data ?? []) {
      out.push({
        id: `r-${r.id}`,
        kind: "registration",
        title: `New team registration · ${r.team_name}`,
        detail: "Waiting for approval",
        at: r.created_at,
        section: "next-season",
      });
    }

    for (const c of champs.data ?? []) {
      out.push({
        id: `c-${c.id}`,
        kind: "champion",
        title: `Champion added · ${c.team_name}`,
        detail: c.season_title,
        at: c.created_at,
        section: "memories",
      });
    }
    for (const p of photos.data ?? []) {
      out.push({
        id: `p-${p.id}`,
        kind: "photo",
        title: "New gallery photo",
        detail: p.caption || "Match day photo",
        at: p.created_at,
        section: "memories",
      });
    }

    return out.sort((a, b) => b.at.localeCompare(a.at));
  },
);
