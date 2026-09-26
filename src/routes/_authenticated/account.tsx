import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/tournament-ui";
import { supabase } from "@/integrations/supabase/client";
import {
  claimReceipt,
  getMyAccount,
  getMyReceiptUrl,
  withdrawPartnerRequest,
} from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Motionsserien" },
      { name: "description", content: "Your team, partner status and receipts for Motionsserien." },
      { property: "og:title", content: "My account — Motionsserien" },
      { property: "og:description", content: "Your team, partner status and receipts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

const PARTNER_STATUS: Record<string, string> = {
  pending: "Waiting for approval",
  approved: "Approved – looking for a partner",
  paired: "Paired – awaiting team approval",
  rejected: "Not approved",
  withdrawn: "Withdrawn",
};

const TEAM_STATUS: Record<string, string> = {
  pending: "Awaiting approval",
  accepted: "Team confirmed",
  waitlisted: "Waiting list",
  rejected: "Not accepted",
};

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const claim = useServerFn(claimReceipt);
  const receiptUrl = useServerFn(getMyReceiptUrl);
  const withdraw = useServerFn(withdrawPartnerRequest);
  const { data, isLoading, error } = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const [busy, setBusy] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function getReceipt(amount: 400 | 800) {
    if (!confirm(`Create your ${amount} kr receipt? This can only be done once.`)) return;
    setBusy(true);
    try {
      const { url } = await claim({ data: { amount } });
      window.open(url, "_blank");
      toast.success("Receipt created. A copy link has been emailed to you.");
      await queryClient.invalidateQueries({ queryKey: ["my-account"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the receipt.");
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string) {
    try {
      const { url } = await receiptUrl({ data: { id } });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed.");
    }
  }

  return (
    <>
      <PageHeader eyebrow="Player account" title="My account" description={data ? `Signed in as ${data.email}` : ""} />
      <div className="mb-4 flex justify-end">
        <button onClick={signOut} className="rounded border border-input px-3 py-1.5 text-sm font-semibold hover:bg-secondary">
          Sign out
        </button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
      {data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-lg font-bold">My teams</h2>
            {data.teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You're not on a team yet.{" "}
                {data.registration.isOpen ? (
                  <Link to="/register" className="font-semibold text-primary underline">Register or join a team</Link>
                ) : (
                  "Registration opens before the next tournament."
                )}
              </p>
            ) : (
              <ul className="space-y-2">
                {data.teams.map((t) => (
                  <li key={t.registrationId} className="rounded border border-border p-3 text-sm">
                    <div className="font-semibold">{t.teamName}</div>
                    <div className="text-muted-foreground">
                      {t.seasonKey} · {TEAM_STATUS[t.status] ?? t.status}
                    </div>
                    <div className="text-muted-foreground">
                      {t.player1Name}
                      {t.player2Name ? ` & ${t.player2Name}` : " · waiting for your partner to join"}
                    </div>
                    {t.performance ? (
                      <div className="mt-2 rounded border border-border bg-secondary/40 p-2">
                        <div className="font-semibold">
                          Division {t.performance.division} · Rank {t.performance.rank}
                        </div>
                        <div className="tabnum text-muted-foreground">
                          Matches {t.performance.matchWins}/{t.performance.played} won · Sets {t.performance.setsWon}–{t.performance.setsLost} · Points {t.performance.pointsFor}–{t.performance.pointsAgainst}
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.partnerRequest && data.partnerRequest.status !== "withdrawn" ? (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-lg font-bold">Find a partner</h2>
              <p className="text-sm">
                Status: <strong>{PARTNER_STATUS[data.partnerRequest.status] ?? data.partnerRequest.status}</strong>
              </p>
              {["pending", "approved"].includes(data.partnerRequest.status) ? (
                <button
                  className="mt-3 rounded border border-input px-3 py-1.5 text-sm hover:bg-secondary"
                  onClick={async () => {
                    await withdraw();
                    await queryClient.invalidateQueries({ queryKey: ["my-account"] });
                  }}
                >
                  Withdraw request
                </button>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
            <h2 className="mb-3 text-lg font-bold">Signed-up teams · {data.registration.key}</h2>
            {data.signedUpTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams have signed up yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-2 text-left font-semibold">Team</th>
                    <th className="py-2 pr-2 text-left font-semibold">Players</th>
                    <th className="py-2 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.signedUpTeams.map((t) => (
                    <tr key={t.teamName} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-2 font-semibold">{t.teamName}</td>
                      <td className="py-2 pr-2 text-muted-foreground">
                        {t.player1Name}
                        {t.player2Name ? ` & ${t.player2Name}` : ""}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{TEAM_STATUS[t.status] ?? t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
            <h2 className="mb-3 text-lg font-bold">Receipts</h2>
            {data.receiptOffer && !data.receiptOffer.alreadyClaimed ? (
              data.receiptOffer.remaining > 0 ? (
                <div className="mb-4 rounded border border-primary/20 bg-primary/5 p-3 text-sm">
                  <p className="mb-2">
                    Get your receipt for <strong>{data.receiptOffer.teamName}</strong>. {data.receiptOffer.remaining} kr of 800 kr is still available for your team.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button disabled={busy} onClick={() => getReceipt(400)} className="rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-40">
                      400 kr (half)
                    </button>
                    {data.receiptOffer.remaining >= 800 ? (
                      <button disabled={busy} onClick={() => getReceipt(800)} className="rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-40">
                        800 kr (whole team)
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mb-4 text-sm text-muted-foreground">Your team's full 800 kr has already been used for receipts.</p>
              )
            ) : null}
            {data.receipts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No receipts yet. They become available when the tournament is finished.</p>
            ) : (
              <ul className="space-y-2">
                {data.receipts.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-3 text-sm">
                    <span>
                      #{r.invoiceNo} · {r.teamName} · {r.seasonKey} · <strong>{r.amount} kr</strong> · {new Date(r.createdAt).toLocaleDateString("sv-SE")}
                      {r.status !== "issued" ? " · cancelled" : ""}
                    </span>
                    {r.status === "issued" ? (
                      <button onClick={() => download(r.id)} className="rounded border border-input px-3 py-1 font-semibold hover:bg-secondary">
                        Download PDF
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
