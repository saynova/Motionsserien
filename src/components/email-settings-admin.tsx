import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { getEmailSettingsAdmin, saveEmailSettings } from "@/lib/email-settings.functions";

const btn =
  "rounded border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70 disabled:opacity-40";
const field = "w-full rounded border border-input bg-background px-3 py-2 text-sm";
const label = "block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";

export function EmailSettingsAdmin() {
  const queryClient = useQueryClient();
  const load = useServerFn(getEmailSettingsAdmin);
  const save = useServerFn(saveEmailSettings);

  const settings = useQuery({ queryKey: ["email-settings", "admin"], queryFn: () => load() });

  const [closingEn, setClosingEn] = useState("");
  const [closingSv, setClosingSv] = useState("");
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setClosingEn(settings.data.closingEn);
    setClosingSv(settings.data.closingSv);
    setSignature(settings.data.signature);
  }, [settings.data]);

  async function submit() {
    setBusy(true);
    try {
      await save({ data: { closingEn, closingSv, signature } });
      await queryClient.invalidateQueries({ queryKey: ["email-settings", "admin"] });
      toast.success("Email settings saved. They apply to the next email you send.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-2xl font-bold uppercase tracking-wide">Email settings</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        These texts end every email you send from the website — replies, new emails, and score
        reminders. Edit them here; changes apply to the next email.
      </p>

      {settings.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="block space-y-1">
            <span className={label}>Closing sentence (English)</span>
            <textarea
              rows={2}
              className={field}
              value={closingEn}
              onChange={(e) => setClosingEn(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className={label}>Closing sentence (Swedish)</span>
            <textarea
              rows={2}
              className={field}
              value={closingSv}
              onChange={(e) => setClosingSv(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className={label}>Signature</span>
            <textarea
              rows={3}
              className={field}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
            <span className="block text-xs text-muted-foreground">
              One line per row — each row appears on its own line in the email.
            </span>
          </label>

          <button className={btn} disabled={busy} onClick={submit}>
            <Save className="mr-1.5 inline size-3.5" aria-hidden="true" />
            {busy ? "Saving…" : "Save email settings"}
          </button>
        </div>
      )}
    </section>
  );
}
