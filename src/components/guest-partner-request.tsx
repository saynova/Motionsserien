import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitGuestPartnerRequest } from "@/lib/registration.functions";
import { DIVISION_COUNT } from "@/lib/tournament";

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function GuestPartnerRequest() {
  const submit = useServerFn(submitGuestPartnerRequest);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return <div className="space-y-2 border border-border bg-card p-5 rounded-lg" role="status">
    <h2 className="text-lg font-bold">Your request has been received</h2>
    <p className="text-sm text-muted-foreground">The admin will review your request and contact you by email about finding a partner.</p>
  </div>;
  return <form className="space-y-4 rounded-lg border border-border bg-card p-5" onSubmit={async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await submit({ data: {
        name: String(values.get("name") ?? ""), email: String(values.get("email") ?? ""),
        previousDivision: String(values.get("division") ?? "new"),
        availability: String(values.get("availability") ?? ""), note: String(values.get("note") ?? ""),
        accepted: true, website: String(values.get("website") ?? ""),
      } });
      setDone(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to send your request."); }
    finally { setBusy(false); }
  }}>
    <h2 className="text-lg font-bold">Find me a partner</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Your name<input name="name" className={field} autoComplete="name" minLength={2} maxLength={60} required /></label>
      <label className="space-y-1 text-sm">Email address<input name="email" className={field} type="email" autoComplete="email" maxLength={120} required /></label>
      <label className="space-y-1 text-sm">Your level (previous division)<select name="division" className={field}>
        <option value="new">New player</option>
        {Array.from({ length: DIVISION_COUNT }, (_, i) => <option key={i} value={i + 1}>Division {i + 1}</option>)}
      </select></label>
      <label className="space-y-1 text-sm">Availability<input name="availability" className={field} placeholder="e.g. every Monday" maxLength={200} /></label>
    </div>
    <label className="block space-y-1 text-sm">Note (optional)<textarea name="note" className={field} rows={3} maxLength={500} /></label>
    <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="text-xs text-muted-foreground">Your details are private. The admin will contact you at the email address above.</p>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1 accent-primary" /><span>I have read and accept the <Link to="/terms" className="text-primary underline">Terms &amp; Conditions</Link>.</span></label>
    <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send request"}</Button>
  </form>;
}