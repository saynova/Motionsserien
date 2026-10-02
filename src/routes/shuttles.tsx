import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Package, ShieldCheck, Smartphone, Truck } from "lucide-react";
import { shuttleOrdersQueryOptions } from "@/lib/tournament-query";
import { submitShuttleOrder } from "@/lib/extras.functions";

export const Route = createFileRoute("/shuttles")({
  head: () => ({
    meta: [
      { title: "Shuttle purchase — Motionsserien HT-26" },
      {
        name: "description",
        content:
          "Order badminton shuttles for your team and see every approved purchase with the running total for Motionsserien HT-26.",
      },
      {
        name: "keywords",
        content:
          "badminton shuttles Ludvika, badmintonbollar, feather shuttles, köpa badmintonbollar, Motionsserien shuttles, badminton gear Dalarna",
      },
      { property: "og:title", content: "Shuttle purchase — Motionsserien HT-26" },
      {
        property: "og:description",
        content: "Order shuttles for your team and follow the approved purchase list.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.motionsserien.se/shuttles" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.motionsserien.se/shuttles" }],
  }),

  loader: ({ context }) => context.queryClient.ensureQueryData(shuttleOrdersQueryOptions),
  component: ShuttlesPage,
});

const field = "w-full rounded border border-input bg-card px-3 py-2 text-sm font-medium";

function ShuttlesPage() {
  const { data } = useSuspenseQuery(shuttleOrdersQueryOptions);
  const queryClient = useQueryClient();
  const send = useServerFn(submitShuttleOrder);

  const [teamName, setTeamName] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await send({ data: { teamName, buyerName, quantity: Number(quantity) } });
      toast.success("Order sent. It appears in the list once an admin approves it.");
      setTeamName("");
      setBuyerName("");
      setQuantity("1");
      await queryClient.invalidateQueries({ queryKey: ["shuttle-orders"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-accent/15 p-6 shadow-sm sm:p-10">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-12 left-1/3 size-48 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              <Package className="size-3.5" aria-hidden="true" />
              Shuttles
            </span>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Shuttle <span className="text-primary">purchase</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Order shuttles for your team. Every order is checked by an admin before it shows in the public list.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/90 p-4 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Boxes ordered</span>
            <p className="tabnum font-display text-3xl font-bold">{data.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.orders.length} approved order{data.orders.length === 1 ? "" : "s"} · one box per team per week
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            <Truck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            Shuttles are delivered each Monday at 20:00 in the Rackethall.
          </div>

          <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">Order form</h2>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Team name</label>
              <input className={field} value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={60} required />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Buyer name</label>
              <input className={field} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} maxLength={60} required />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Number of shuttle Box</label>
              <input className={`${field} tabnum`} type="number" min={1} max={1} value={quantity} onChange={() => setQuantity("1")} readOnly required />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
              <span>
                I have read and accept the{" "}
                <Link to="/terms" className="font-semibold text-primary underline">Terms &amp; Conditions</Link>.
              </span>
            </label>
            <button
              type="submit"
              disabled={busy || !accepted}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-40"
            >
              {busy ? "Sending…" : "Order shuttles"}
            </button>
          </form>

          <section className="rounded-xl border border-accent/40 border-l-4 border-l-accent bg-accent/10 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Smartphone className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Pay with Swish</h2>
                <p className="text-xs text-muted-foreground">Ludvika Badmintonklubb</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-card p-3">
                <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Price</dt>
                <dd className="font-display text-xl font-bold">135 kr</dd>
                <dd className="text-xs text-muted-foreground">per box</dd>
              </div>
              <div className="rounded-lg bg-card p-3">
                <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Swish number</dt>
                <dd className="tabnum font-display text-xl font-bold">1234785069</dd>
              </div>
            </dl>
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-card p-3 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                Each team can order one shuttle box within one week. This helps us keep enough stock for all teams.
              </span>
            </p>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <h2 className="font-display text-lg font-bold">Approved purchases</h2>
            <span className="rounded-full bg-up/10 px-2.5 py-0.5 text-xs font-bold text-up">
              {data.total} boxes total
            </span>
          </div>
          {data.orders.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Package className="size-8 text-primary" aria-hidden="true" />
              </span>
              <p className="mt-4 font-display text-lg font-bold">No approved purchases yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Approved orders appear here with team and buyer.</p>
            </div>
          ) : (
            <ul className="grid gap-3 p-4 sm:grid-cols-2">
              {data.orders.map((order, i) => (
                <li
                  key={order.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <span className="tabnum flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{order.team_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{order.buyer_name}</p>
                  </div>
                  <span className="tabnum shrink-0 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-bold">
                    {order.quantity} box{order.quantity === 1 ? "" : "es"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
