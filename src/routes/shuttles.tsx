import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/tournament-ui";
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
      { property: "og:title", content: "Shuttle purchase — Motionsserien HT-26" },
      {
        property: "og:description",
        content: "Order shuttles for your team and follow the approved purchase list.",
      },
    ],
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
    <>
      <PageHeader
        eyebrow="Shuttles"
        title="Shuttle purchase"
        description="Order shuttles for your team. Every order is checked by an admin before it shows in the public list below."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-lg border border-border bg-card p-4"
        >
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Team name
            </label>
            <input
              className={field}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={60}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Buyer name
            </label>
            <input
              className={field}
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              maxLength={60}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Number of shuttle Box
            </label>
            <input
              className={`${field} tabnum`}
              type="number"
              min={1}
              max={200}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Shuttle will be delivered each monday at 20:00 in the Rackethall.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Sending…" : "Order shuttles"}
          </button>
        </form>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
            <h2 className="text-lg font-bold uppercase tracking-wider text-primary">
              Approved purchases
            </h2>
            <span className="tabnum text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {data.orders.length} order{data.orders.length === 1 ? "" : "s"} · {data.total} shuttles
              total
            </span>
          </div>
          {data.orders.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No approved purchases yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 text-left font-semibold">Team</th>
                  <th className="px-2 py-2 text-left font-semibold">Buyer</th>
                  <th className="px-4 py-2 text-right font-semibold">Shuttles</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 font-semibold">{order.team_name}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{order.buyer_name}</td>
                    <td className="tabnum px-4 py-2.5 text-right font-semibold">
                      {order.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
