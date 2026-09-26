import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  adminReceiptUrl,
  listPartnerRequests,
  listReceipts,
  pairPartners,
  setPartnerRequestStatus,
  setSeasonAccountFlags,
  voidReceipt,
} from "@/lib/account-admin.functions";

const card = "rounded-lg border border-border bg-card p-4";

const STATUS: Record<string, string> = {
  pending: "Waiting for approval",
  approved: "Approved – looking for partner",
  paired: "Paired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function PartnerRequestsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listPartnerRequests);
  const setStatus = useServerFn(setPartnerRequestStatus);
  const pair = useServerFn(pairPartners);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-partner-requests"], queryFn: () => list() });
  const [picked, setPicked] = useState<string[]>([]);
  const [teamName, setTeamName] = useState("");
  const [show, setShow] = useState<"open" | "all">("open");

  const rows = data.filter((r) => show === "all" || r.status === "pending" || r.status === "approved");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-partner-requests"] });

  async function act(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    }
  }

  const pickedRows = picked.map((id) => data.find((r) => r.id === id)).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-lg font-bold">Find a partner</h2>
        <p className="text-sm text-muted-foreground">
          Solo players who asked for a partner. Approve them, then tick two approved players and pair them into a team. The team then waits for approval under Registration &amp; seeding.
        </p>
        {pickedRows.length === 2 ? (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded border border-primary/20 bg-primary/5 p-3">
            <div className="text-sm">
              Pair <strong>{pickedRows[0]!.name}</strong> + <strong>{pickedRows[1]!.name}</strong>
            </div>
            <input className="rounded border border-input bg-card px-2 py-1.5 text-sm" placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <Button
              size="sm"
              onClick={() =>
                act(async () => {
                  await pair({ data: { firstId: picked[0]!, secondId: picked[1]!, teamName } });
                  setPicked([]);
                  setTeamName("");
                }, "Paired. Both players were emailed.")
              }
            >
              Pair up
            </Button>
          </div>
        ) : null}
        <div className="mt-3 flex gap-2 text-sm">
          <Button size="sm" variant={show === "open" ? "default" : "outline"} onClick={() => setShow("open")}>Open</Button>
          <Button size="sm" variant={show === "all" ? "default" : "outline"} onClick={() => setShow("all")}>All</Button>
        </div>
      </div>
      {isLoading ? <p className="text-sm">Loading…</p> : null}
      {rows.length === 0 && !isLoading ? <p className="text-sm text-muted-foreground">No requests.</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className={card}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.email} · {r.season_key}</div>
              </div>
              {r.status === "approved" ? (
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={picked.includes(r.id)}
                    onChange={(e) =>
                      setPicked((p) => (e.target.checked ? [...p, r.id].slice(-2) : p.filter((x) => x !== r.id)))
                    }
                  />
                  Pick
                </label>
              ) : null}
            </div>
            <div className="mt-2 text-sm">
              Level: {r.previous_division ? `Division ${r.previous_division}` : "New"} · {STATUS[r.status] ?? r.status}
            </div>
            {r.availability ? <div className="text-sm text-muted-foreground">Availability: {r.availability}</div> : null}
            {r.note ? <div className="text-sm text-muted-foreground">Note: {r.note}</div> : null}
            {r.status === "pending" || r.status === "rejected" ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => act(() => setStatus({ data: { id: r.id, status: "approved" } }), "Approved and emailed.")}>Approve</Button>
                {r.status === "pending" ? (
                  <Button size="sm" variant="outline" onClick={() => act(() => setStatus({ data: { id: r.id, status: "rejected" } }), "Rejected.")}>Reject</Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReceiptsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listReceipts);
  const setFlags = useServerFn(setSeasonAccountFlags);
  const voidFn = useServerFn(voidReceipt);
  const urlFn = useServerFn(adminReceiptUrl);
  const { data, isLoading } = useQuery({ queryKey: ["admin-receipts"], queryFn: () => list() });
  const [filter, setFilter] = useState<"all" | "received" | "partly" | "none">("all");
  const [q, setQ] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-receipts"] });

  const teams = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.teams ?? []).filter((t) => {
      if (filter === "received" && t.used < 800) return false;
      if (filter === "partly" && !(t.used > 0 && t.used < 800)) return false;
      if (filter === "none" && t.used > 0) return false;
      if (!s) return true;
      return t.teamName.toLowerCase().includes(s) || t.players.some((p) => p.toLowerCase().includes(s));
    });
  }, [data, filter, q]);

  if (isLoading) return <p className="text-sm">Loading…</p>;
  const season = data?.season;

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-lg font-bold">Receipts &amp; player accounts</h2>
        {season ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-muted-foreground">Season: {season.name}</p>
            {!season.accountBased ? (
              <p className="rounded bg-secondary p-2">
                This season was started before player accounts existed, so receipts and sign-in for scores apply from the next tournament.
              </p>
            ) : null}
            <label className="flex items-center gap-2">
              <Switch
                checked={season.requireLogin}
                onCheckedChange={async (v) => {
                  await setFlags({ data: { seasonId: season.id, requireLogin: v } });
                  await refresh();
                }}
              />
              Players must sign in to submit scores (own team only)
            </label>
            <label className="flex items-center gap-2">
              <Switch
                disabled={!season.accountBased}
                checked={season.invoicesOpen}
                onCheckedChange={async (v) => {
                  await setFlags({ data: { seasonId: season.id, invoicesOpen: v } });
                  await refresh();
                }}
              />
              Receipts open (players can get their receipt on My account)
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active season.</p>
        )}
      </div>

      {season?.accountBased ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "received", "partly", "none"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "received" ? "Received" : f === "partly" ? "Partly received" : "Not received"}
              </Button>
            ))}
            <input className="rounded border border-input bg-card px-2 py-1.5 text-sm" placeholder="Search team or player" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Team</th>
                  <th className="p-2">Used / left</th>
                  <th className="p-2">Receipts</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.registrationId} className="border-t border-border align-top">
                    <td className="p-2">
                      <div className="font-semibold">{t.teamName}</div>
                      <div className="text-xs text-muted-foreground">{t.players.join(" & ")}</div>
                    </td>
                    <td className="p-2 whitespace-nowrap">{t.used} kr / {800 - t.used} kr</td>
                    <td className="p-2">
                      {t.receipts.length === 0 ? <span className="text-muted-foreground">None</span> : null}
                      {t.receipts.map((r) => (
                        <div key={r.id} className="mb-1 flex flex-wrap items-center gap-2">
                          <span className={r.status !== "issued" ? "line-through text-muted-foreground" : ""}>
                            #{r.invoiceNo} {r.playerName} · {r.amount} kr · {new Date(r.createdAt).toLocaleDateString("sv-SE")}
                          </span>
                          {r.status === "issued" ? (
                            <>
                              <Button size="sm" variant="outline" onClick={async () => window.open((await urlFn({ data: { id: r.id } })).url, "_blank")}>Download</Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (!confirm("Void this receipt? The amount becomes available again.")) return;
                                  await voidFn({ data: { id: r.id } });
                                  toast.success("Receipt voided.");
                                  await refresh();
                                }}
                              >
                                Void
                              </Button>
                            </>
                          ) : null}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
