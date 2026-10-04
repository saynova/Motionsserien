import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock,
  Eye,
  Film,
  Globe2,
  Images,
  Laptop,
  MapPin,
  Monitor,
  Repeat,
  Smartphone,
  Tablet,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { galleryViewsQueryOptions, visitsQueryOptions } from "@/lib/tournament-query";
import { purgeOldVisits } from "@/lib/visitors.functions";

const btnGhost =
  "rounded border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70 disabled:opacity-40";

const DAY = 24 * 60 * 60 * 1000;

function when(value: string) {
  return new Date(value).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
}

function relative(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return when(value);
}

function dayKey(d: Date) {
  return d.toLocaleDateString("sv-SE");
}

function deviceKind(device: string) {
  const d = (device || "").toLowerCase();
  if (d.includes("mobile") || d.includes("phone")) return "Mobile";
  if (d.includes("tablet") || d.includes("ipad")) return "Tablet";
  if (d.includes("desktop") || d.includes("computer")) return "Desktop";
  return d ? "Desktop" : "Unknown";
}

function DeviceIcon({ kind, className }: { kind: string; className?: string }) {
  if (kind === "Mobile") return <Smartphone className={className} />;
  if (kind === "Tablet") return <Tablet className={className} />;
  if (kind === "Desktop") return <Monitor className={className} />;
  return <Laptop className={className} />;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background/40 to-background/10 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <p className="tabnum mt-2 font-display text-3xl font-bold leading-none text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function RankList({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: { label: string; value: number }[];
  empty: string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate font-medium">{row.label}</span>
                <span className="tabnum shrink-0 font-bold text-primary">{row.value}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function topCounts(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function VisitorsAdmin() {
  const visits = useQuery(visitsQueryOptions);
  const galleryViews = useQuery(galleryViewsQueryOptions);
  const queryClient = useQueryClient();
  const purge = useServerFn(purgeOldVisits);
  const [path, setPath] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = visits.data ?? [];
  const paths = useMemo(() => [...new Set(rows.map((r) => r.path))].sort(), [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (path !== "" && r.path !== path) return false;
      if (!term) return true;
      return [r.ip, r.path, r.device, r.os, r.browser, r.city, r.country, r.referrer]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [rows, path, search]);

  // One row per unique IP, newest visit first, with a total visit counter.
  const uniqueRows = useMemo(() => {
    const byIp = new Map<string, { latest: (typeof filtered)[number]; count: number }>();
    for (const row of filtered) {
      const key = row.ip || `unknown:${row.id}`;
      const existing = byIp.get(key);
      if (existing) existing.count += 1;
      else byIp.set(key, { latest: row, count: 1 });
    }
    return [...byIp.values()].sort((a, b) => b.count - a.count);
  }, [filtered]);

  const stats = useMemo(() => {
    const now = Date.now();
    const at = (r: (typeof rows)[number]) => new Date(r.created_at).getTime();
    const within = (ms: number) => rows.filter((r) => now - at(r) < ms);

    const day = within(DAY);
    const week = within(7 * DAY);
    const uniqueAll = new Set(rows.map((r) => r.ip).filter(Boolean)).size;
    const uniqueWeek = new Set(week.map((r) => r.ip).filter(Boolean)).size;

    // Daily trend for the last 14 days.
    const trend: { day: string; label: string; visits: number; visitors: number }[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(now - i * DAY);
      const key = dayKey(d);
      const dayRows = rows.filter((r) => dayKey(new Date(r.created_at)) === key);
      trend.push({
        day: key,
        label: d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" }),
        visits: dayRows.length,
        visitors: new Set(dayRows.map((r) => r.ip).filter(Boolean)).size,
      });
    }

    // Hourly distribution (local Swedish hours).
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}`,
      visits: 0,
    }));
    for (const r of rows) {
      const h = new Date(r.created_at).getHours();
      const bucket = hourly[h];
      if (bucket) bucket.visits += 1;
    }
    const peakHour = hourly.reduce((best, h) => (h.visits > best.visits ? h : best), hourly[0]!);

    // Monday (match night) share.
    const mondays = rows.filter((r) => new Date(r.created_at).getDay() === 1).length;

    // Device split.
    const deviceCounts = new Map<string, number>();
    for (const r of rows) {
      const kind = deviceKind(r.device);
      deviceCounts.set(kind, (deviceCounts.get(kind) ?? 0) + 1);
    }
    const devices = [...deviceCounts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const mobileShare = rows.length
      ? Math.round(((deviceCounts.get("Mobile") ?? 0) / rows.length) * 100)
      : 0;

    const cities = topCounts(
      rows.map((r) => [r.city, r.country].filter(Boolean).join(", ")),
      6,
    );
    const pages = topCounts(
      rows.map((r) => r.path),
      6,
    );
    const sources = topCounts(
      rows.map((r) => {
        if (!r.referrer) return "Direct";
        try {
          return new URL(r.referrer).hostname.replace(/^www\./, "");
        } catch {
          return r.referrer;
        }
      }),
      6,
    );
    const browsers = topCounts(
      rows.map((r) => [r.browser, r.os].filter(Boolean).join(" · ")),
      6,
    );

    const repeatVisitors = (() => {
      const counts = new Map<string, number>();
      for (const r of rows) if (r.ip) counts.set(r.ip, (counts.get(r.ip) ?? 0) + 1);
      return [...counts.values()].filter((c) => c > 1).length;
    })();

    return {
      day: day.length,
      week: week.length,
      uniqueAll,
      uniqueWeek,
      trend,
      hourly,
      peakHour,
      mondays,
      devices,
      mobileShare,
      cities,
      pages,
      sources,
      browsers,
      repeatVisitors,
      topCity: cities[0]?.label ?? "—",
    };
  }, [rows]);

  const deviceColors = ["var(--color-mobile)", "var(--color-desktop)", "var(--color-other)"];

  const mediaStats = useMemo(() => {
    const items = galleryViews.data ?? [];
    const totalViews = items.reduce((sum, item) => sum + item.viewCount, 0);
    const viewedItems = items.filter((item) => item.viewCount > 0).length;
    const photos = items
      .filter((item) => item.mediaType === "photo")
      .reduce((sum, item) => sum + item.viewCount, 0);
    const videos = totalViews - photos;
    const top = items[0];
    const ranked = items.slice(0, 10).map((item, index) => ({
      ...item,
      rank: index + 1,
      label: item.caption.trim() || `${item.mediaType === "video" ? "Video" : "Photo"} ${index + 1}`,
    }));
    return {
      items,
      totalViews,
      viewedItems,
      average: items.length ? Math.round(totalViews / items.length) : 0,
      top,
      ranked,
      split: [
        { name: "Photos", value: photos },
        { name: "Videos", value: videos },
      ].filter((entry) => entry.value > 0),
    };
  }, [galleryViews.data]);

  async function onPurge() {
    if (!window.confirm("Delete all visit records older than 30 days?")) return;
    setBusy(true);
    try {
      await purge({});
      await queryClient.invalidateQueries({ queryKey: ["visits", "admin"] });
      toast.success("Old visit records deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete old records.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-surface rounded-xl border border-border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Visitors</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Traffic overview built from the most recent 400 page visits. Only you can see this.
          </p>
        </div>
        <button className={btnGhost} disabled={busy} onClick={onPurge}>
          Delete logs older than 30 days
        </button>
      </div>

      {visits.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading visits…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No visits recorded yet.</p>
      ) : (
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="media">Photo &amp; video views</TabsTrigger>
            <TabsTrigger value="logs">Detailed log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Last 24 hours"
                value={stats.day}
                hint="page visits"
                icon={TrendingUp}
              />
              <StatCard
                label="Last 7 days"
                value={stats.week}
                hint={`${stats.uniqueWeek} unique visitors`}
                icon={Users}
              />
              <StatCard
                label="Mobile share"
                value={`${stats.mobileShare}%`}
                hint={`${100 - stats.mobileShare}% computer or tablet`}
                icon={Smartphone}
              />
              <StatCard
                label="Busiest hour"
                value={`${String(stats.peakHour.hour).padStart(2, "0")}:00`}
                hint={`${stats.peakHour.visits} visits · ${stats.mondays} on Mondays`}
                icon={Clock}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/40 p-4 lg:col-span-2">
                <h3 className="text-sm font-bold">Visits over the last 14 days</h3>
                <ChartContainer
                  config={{
                    visits: { label: "Page visits", color: "var(--primary)" },
                    visitors: { label: "Unique visitors", color: "var(--accent)" },
                  }}
                  className="mt-3 aspect-[16/7] w-full"
                >
                  <AreaChart data={stats.trend} margin={{ left: -18, right: 6, top: 6 }}>
                    <defs>
                      <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-visits)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--color-visits)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={38} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      stroke="var(--color-visits)"
                      strokeWidth={2}
                      fill="url(#visitsFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      stroke="var(--color-visitors)"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      fill="transparent"
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              <div className="rounded-xl border border-border bg-background/40 p-4">
                <h3 className="text-sm font-bold">Devices</h3>
                <ChartContainer
                  config={{
                    Mobile: { label: "Mobile", color: "var(--primary)" },
                    Desktop: { label: "Computer", color: "var(--accent)" },
                    Tablet: { label: "Tablet", color: "var(--muted-foreground)" },
                    Unknown: { label: "Unknown", color: "var(--muted-foreground)" },
                  }}
                  className="mt-3 aspect-square max-h-48 w-full"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <Pie
                      data={stats.devices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {stats.devices.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={deviceColors[index % deviceColors.length]}
                          style={{ fill: `var(--color-${entry.name})` }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="mt-2 space-y-1 text-xs">
                  {stats.devices.map((entry) => (
                    <li key={entry.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <DeviceIcon kind={entry.name} className="h-3.5 w-3.5 text-primary" />
                        {entry.name}
                      </span>
                      <span className="tabnum font-bold text-primary">{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/40 p-4">
              <h3 className="text-sm font-bold">When people visit (hour of the day)</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Swedish time. Match nights and the Wednesday score deadline show up clearly.
              </p>
              <ChartContainer
                config={{ visits: { label: "Visits", color: "var(--primary)" } }}
                className="mt-3 aspect-[16/5] w-full"
              >
                <BarChart data={stats.hourly} margin={{ left: -20, right: 6, top: 6 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={38} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="visits" radius={[4, 4, 0, 0]} fill="var(--color-visits)" />
                </BarChart>
              </ChartContainer>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <RankList title="Most visited pages" icon={Globe2} rows={stats.pages} empty="—" />
              <RankList title="Top locations" icon={MapPin} rows={stats.cities} empty="—" />
              <RankList title="Came from" icon={TrendingUp} rows={stats.sources} empty="—" />
              <RankList
                title="Browsers and systems"
                icon={Laptop}
                rows={stats.browsers}
                empty="—"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Unique addresses"
                value={stats.uniqueAll}
                hint="across all logged visits"
                icon={Users}
              />
              <StatCard
                label="Returning visitors"
                value={stats.repeatVisitors}
                hint="came back more than once"
                icon={Repeat}
              />
              <StatCard
                label="Top location"
                value={stats.topCity}
                hint="most visits"
                icon={MapPin}
              />
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-5 space-y-5">
            {galleryViews.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading gallery views…</p>
            ) : mediaStats.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background/30 px-6 py-12 text-center">
                <Images className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 font-display text-lg font-bold">No gallery media yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Photos and videos will appear here after they are added to the gallery.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Total media views" value={mediaStats.totalViews} hint="photo and video opens" icon={Eye} />
                  <StatCard label="Viewed items" value={mediaStats.viewedItems} hint={`of ${mediaStats.items.length} uploads`} icon={Images} />
                  <StatCard label="Average views" value={mediaStats.average} hint="per gallery item" icon={TrendingUp} />
                  <StatCard
                    label="Most viewed"
                    value={mediaStats.top?.viewCount ?? 0}
                    hint={mediaStats.top?.caption || (mediaStats.top?.mediaType === "video" ? "Untitled video" : "Untitled photo")}
                    icon={Trophy}
                  />
                </div>

                {mediaStats.totalViews === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background/30 px-6 py-10 text-center">
                    <Eye className="mx-auto h-8 w-8 text-primary" />
                    <h3 className="mt-3 font-display text-lg font-bold">No views recorded yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This report updates when visitors open a photo or video.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background/40 p-4 lg:col-span-2">
                      <h3 className="text-sm font-bold">Most-viewed gallery items</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Top 10 by recorded opens</p>
                      <ChartContainer
                        config={{ views: { label: "Views", color: "var(--primary)" } }}
                        className="mt-3 h-[22rem] w-full"
                      >
                        <BarChart data={mediaStats.ranked} layout="vertical" margin={{ left: 12, right: 20 }}>
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                          <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            width={125}
                            tickFormatter={(value: string) => value.length > 18 ? `${value.slice(0, 18)}…` : value}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="viewCount" name="Views" radius={[0, 5, 5, 0]} fill="var(--color-views)" />
                        </BarChart>
                      </ChartContainer>
                    </div>

                    <div className="rounded-xl border border-border bg-background/40 p-4">
                      <h3 className="text-sm font-bold">Views by media type</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Photos compared with videos</p>
                      <ChartContainer
                        config={{
                          Photos: { label: "Photos", color: "var(--primary)" },
                          Videos: { label: "Videos", color: "var(--accent)" },
                        }}
                        className="mt-3 aspect-square max-h-56 w-full"
                      >
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                          <Pie data={mediaStats.split} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3} strokeWidth={0}>
                            {mediaStats.split.map((entry) => (
                              <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                      <ul className="mt-3 space-y-2 text-sm">
                        {mediaStats.split.map((entry) => (
                          <li key={entry.name} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 font-medium">
                              {entry.name === "Videos" ? <Film className="h-4 w-4 text-accent" /> : <Images className="h-4 w-4 text-primary" />}
                              {entry.name}
                            </span>
                            <span className="tabnum font-bold text-primary">{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold">All gallery items</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Ranked by total views</p>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{mediaStats.items.length} items</span>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[42rem] text-left text-sm">
                      <thead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-3">Rank</th>
                          <th className="py-2 pr-3">Gallery item</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3">Uploaded</th>
                          <th className="py-2 text-right">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mediaStats.items.map((item, index) => (
                          <tr key={item.id} className="border-t border-border/60">
                            <td className="tabnum py-3 pr-3 font-bold text-muted-foreground">{index + 1}</td>
                            <td className="max-w-sm py-3 pr-3">
                              <span className="block truncate font-semibold">{item.caption || "Untitled moment"}</span>
                              {item.isPinned ? <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-primary">Featured</span> : null}
                            </td>
                            <td className="py-3 pr-3">
                              <span className="inline-flex items-center gap-1.5 capitalize">
                                {item.mediaType === "video" ? <Film className="h-4 w-4 text-accent" /> : <Images className="h-4 w-4 text-primary" />}
                                {item.mediaType}
                              </span>
                            </td>
                            <td className="whitespace-nowrap py-3 pr-3 text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString("sv-SE")}
                            </td>
                            <td className="tabnum py-3 text-right text-base font-bold text-primary">{item.viewCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-5">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Page
                </span>
                <select
                  className="rounded border border-input bg-card px-3 py-2 text-sm font-medium"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                >
                  <option value="">All pages</option>
                  {paths.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Search
                </span>
                <input
                  className="rounded border border-input bg-card px-3 py-2 text-sm font-medium"
                  placeholder="City, device, address…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            {filtered.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No visits match this filter.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[46rem] text-left text-sm">
                  <thead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">IP</th>
                      <th className="py-2 pr-3">Visits</th>
                      <th className="py-2 pr-3">Last visit</th>
                      <th className="py-2 pr-3">Page</th>
                      <th className="py-2 pr-3">Device</th>
                      <th className="py-2 pr-3">Location</th>
                      <th className="py-2">Came from</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueRows.map(({ latest: row, count }) => {
                      const kind = deviceKind(row.device);
                      return (
                        <tr key={row.ip || row.id} className="border-t border-border/60">
                          <td className="tabnum py-2 pr-3">{row.ip || "—"}</td>
                          <td className="tabnum py-2 pr-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                                count >= 10
                                  ? "border-primary/60 bg-primary/10 text-primary"
                                  : "border-border bg-background/60 text-primary"
                              }`}
                            >
                              {count}
                            </span>
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            <span className="font-medium">{relative(row.created_at)}</span>
                            <span className="tabnum block text-xs text-muted-foreground">
                              {when(row.created_at)}
                            </span>
                          </td>
                          <td className="py-2 pr-3">{row.path}</td>
                          <td className="py-2 pr-3">
                            <span className="flex items-center gap-1.5">
                              <DeviceIcon kind={kind} className="h-3.5 w-3.5 text-primary" />
                              {[row.os, row.browser].filter(Boolean).join(" · ") || kind}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            {[row.city, row.country].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="py-2 break-all text-muted-foreground">
                            {row.referrer || "Direct"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
