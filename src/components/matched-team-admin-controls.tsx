import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Save, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { renameRegisteredTeam, resendMatchedPlayerInvitation } from "@/lib/account-admin.functions";
import type { Registration } from "@/lib/registration.functions";

export function MatchedTeamAdminControls({ registration: r, onRenamed }: { registration: Registration; onRenamed: (oldName: string, newName: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(r.team_name);
  const [busy, setBusy] = useState(false);
  const rename = useServerFn(renameRegisteredTeam);
  const resend = useServerFn(resendMatchedPlayerInvitation);
  const qc = useQueryClient();
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["registrations", "admin"] }),
    qc.invalidateQueries({ queryKey: ["registered-teams"] }),
    qc.invalidateQueries({ queryKey: ["seed-board", "admin"] }),
    qc.invalidateQueries({ queryKey: ["my-account"] }),
    qc.invalidateQueries({ queryKey: ["tournament"] }),
  ]);
  return <div className="mt-2 space-y-2 text-xs font-normal normal-case tracking-normal">
    {editing ? <div className="flex items-center gap-1">
      <input aria-label={`Team name for ${r.team_name}`} className="min-w-0 w-40 rounded border border-input bg-card px-2 py-1.5 text-sm" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      <Button variant="outline" size="icon" title="Save team name" aria-label="Save team name" disabled={busy || name.trim().length < 2} onClick={async () => {
        setBusy(true);
        try { await rename({ data: { id: r.id, teamName: name } }); onRenamed(r.team_name, name.trim()); setEditing(false); await refresh(); toast.success("Team name updated."); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Unable to rename team."); }
        finally { setBusy(false); }
      }}><Save /></Button>
      <Button variant="ghost" size="icon" title="Cancel" aria-label="Cancel team name edit" disabled={busy} onClick={() => setEditing(false)}><X /></Button>
    </div> : <Button variant="ghost" size="sm" onClick={() => { setName(r.team_name); setEditing(true); }}><Pencil />Edit name</Button>}
    {r.requires_player_confirmation ? <div className="space-y-1">
      {([1, 2] as const).map((playerNo) => {
        const confirmed = playerNo === 1 ? r.player1_confirmed_at : r.player2_confirmed_at;
        return <div key={playerNo} className="flex items-center gap-2">
          <span className={confirmed ? "text-up" : "text-muted-foreground"}>Player {playerNo}: {confirmed ? "Confirmed" : "Not confirmed"}</span>
          {!confirmed && r.status !== "rejected" ? <Button variant="outline" size="sm" disabled={busy} title={`Resend invitation to Player ${playerNo}`} onClick={async () => {
            setBusy(true);
            try { const result = await resend({ data: { id: r.id, playerNo } }); if (result.sent) toast.success("Invitation sent."); else toast.warning("Invitation could not be delivered. Check email sending status."); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Unable to resend."); }
            finally { setBusy(false); }
          }}><Mail />Resend</Button> : null}
        </div>;
      })}
    </div> : null}
  </div>;
}