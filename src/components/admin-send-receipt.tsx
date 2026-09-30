import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfViewerDialog, type PdfDoc } from "@/components/pdf-viewer-dialog";
import { adminSendReceipt, listReceiptPlayers } from "@/lib/account-admin.functions";

export function AdminSendReceipt() {
  const send = useServerFn(adminSendReceipt);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState<400 | 800>(400);
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const fetchPlayers = useServerFn(listReceiptPlayers);
  const players = useQuery({ queryKey: ["receipt-players"], queryFn: () => fetchPlayers() });
  const [division, setDivision] = useState<string>("all");
  const list = players.data ?? [];
  const divisions = [...new Set(list.map((p) => p.division).filter((d): d is number => d !== null))].sort((a, b) => a - b);
  const shown = list.filter((p) => division === "all" || String(p.division) === division);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await send({ data: { name, email, amount } });
      toast.success(`Receipt for ${amount} kr sent to ${email}`);
      setDoc({ ...res, title: `Receipt ${amount} kr – ${name}` });
      setName("");
      setEmail("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-border p-4">
      <h3 className="flex items-center gap-2 font-bold">
        <FileText className="h-4 w-4 text-primary" /> Generate and email a receipt
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Creates a receipt from the template and emails the person a download link.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
        <select
          aria-label="Division"
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm"
        >
          <option value="all">All divisions</option>
          {divisions.map((d) => (
            <option key={d} value={String(d)}>Division {d}</option>
          ))}
        </select>
        <select
          aria-label="Player"
          value=""
          onChange={(e) => {
            const p = shown[Number(e.target.value)];
            if (p) { setName(p.name); setEmail(p.email); }
          }}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm"
        >
          <option value="">{players.isLoading ? "Loading players…" : "Choose a player from the current tournament"}</option>
          {shown.map((p, i) => (
            <option key={`${p.teamName}-${p.name}-${i}`} value={i}>
              {p.division ? `D${p.division} · ` : ""}{p.teamName} – {p.name}{p.email ? "" : " (no email)"}
            </option>
          ))}
        </select>
      </div>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="flex gap-1">
          {([400, 800] as const).map((a) => (
            <Button key={a} type="button" variant={amount === a ? "default" : "outline"} onClick={() => setAmount(a)}>
              {a} kr
            </Button>
          ))}
        </div>
        <Button type="submit" disabled={busy}>
          <Send className="mr-1.5 h-4 w-4" /> {busy ? "Sending…" : "Send"}
        </Button>
      </form>
      <PdfViewerDialog doc={doc} onClose={() => setDoc(null)} />
    </div>
  );
}
