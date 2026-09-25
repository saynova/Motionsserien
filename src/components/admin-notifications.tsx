import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, ClipboardCheck, ImageIcon, MessageSquare, Package, Trophy, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { getAdminNotifications, type AdminNotification } from "@/lib/notifications.functions";

const SEEN_KEY = "mssn-admin-notifications-seen";

export function useAdminNotifications() {
  const load = useServerFn(getAdminNotifications);
  const query = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => load(),
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SEEN_KEY);
      if (raw) setSeen(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setSeen(next);
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-500)));
    } catch {
      /* ignore */
    }
  }, []);

  // Keep read state in sync across tabs of the same browser.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SEEN_KEY || !e.newValue) return;
      try {
        setSeen(new Set(JSON.parse(e.newValue) as string[]));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const items = query.data ?? [];
  const unread = items.filter((item) => !seen.has(item.id));

  // Show the unread count in the browser tab and toast when new ones arrive.
  const [known, setKnown] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!query.data) return;
    if (known) {
      const fresh = query.data.filter((i) => !known.has(i.id) && !seen.has(i.id));
      if (fresh.length > 0) toast.info(fresh.length === 1 ? fresh[0].title : `${fresh.length} new notifications`);
    }
    setKnown(new Set(query.data.map((i) => i.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = unread.length > 0 ? `(${unread.length > 99 ? "99+" : unread.length}) ${base}` : base;
  }, [unread.length]);

  return {
    items,
    unreadCount: unread.length,
    isUnread: (id: string) => !seen.has(id),
    markRead: (id: string) => persist(new Set([...seen, id])),
    markAllRead: () => persist(new Set([...seen, ...items.map((i) => i.id)])),
    isLoading: query.isLoading,
  };
}

export type NotificationsState = ReturnType<typeof useAdminNotifications>;

const ICONS: Record<AdminNotification["kind"], typeof Bell> = {
  question: MessageSquare,
  score: ClipboardCheck,
  shuttle: Package,
  registration: UserPlus,
  champion: Trophy,
  photo: ImageIcon,
};

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function NotificationsPanel({
  state,
  onOpen,
}: {
  state: NotificationsState;
  onOpen: (section: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Bell className="h-5 w-5 text-primary" /> Notifications
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New questions, submitted scores, shuttle orders, registrations, champions and photos that need your
            attention. Updates automatically every few seconds.
          </p>
        </div>
        <button
          type="button"
          disabled={state.unreadCount === 0}
          onClick={state.markAllRead}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </button>
      </header>

      {state.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : state.items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          You're all caught up — nothing needs attention right now.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {state.items.map((item) => {
            const Icon = ICONS[item.kind];
            const unread = state.isUnread(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    state.markRead(item.id);
                    onOpen(item.section);
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60 ${
                    unread ? "bg-primary/5" : ""
                  }`}
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${unread ? "font-bold" : "font-medium"}`}>
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {timeAgo(item.at)}
                    {unread ? <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
