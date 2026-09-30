import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileText, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfViewerDialog, type PdfDoc } from "@/components/pdf-viewer-dialog";
import { adminSendReceipt } from "@/lib/account-admin.functions";

export function AdminSendReceipt() {
  const send = useServerFn(adminSendReceipt);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState<400 | 800>(400);
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<PdfDoc | null>(null);

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
