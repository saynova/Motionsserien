import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegistrationEmailReminder } from "@/components/registration-email-reminder";
import { getMatchedTeamInvitation, confirmMatchedTeam } from "@/lib/team-confirmation.functions";

export const Route = createFileRoute("/team-confirmation")({
  head: () => ({ meta: [
    { title: "Confirm your matched team — Motionsserien badminton" },
    { name: "description", content: "Review your partner invitation and confirm your Motionsserien badminton team." },
    { property: "og:title", content: "Confirm your matched team — Motionsserien" },
    { property: "og:description", content: "Confirm your team formation with your matched badminton partner." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" }, { name: "referrer", content: "no-referrer" },
  ] }),
  component: TeamConfirmationPage,
});

function TeamConfirmationPage() {
  const fetchInvitation = useServerFn(getMatchedTeamInvitation);
  const confirm = useServerFn(confirmMatchedTeam);
  const [token, setToken] = useState("");
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof getMatchedTeamInvitation>> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const secret = window.location.hash.slice(1);
    // Remove the bearer secret immediately; it stays in this page's memory only.
    window.history.replaceState(null, "", window.location.pathname);
    if (!/^[a-f0-9]{64}$/.test(secret)) { setError("Please open your private team invitation from your email."); setLoading(false); return; }
    setToken(secret);
    let cancelled = false;
    void fetchInvitation({ data: { token: secret } }).then((value) => { if (!cancelled) setInvitation(value); }).catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Unable to open invitation."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchInvitation]);

  return <section className="mx-auto max-w-2xl space-y-6 py-8">
    <Users className="size-9 text-primary" aria-hidden="true" />
    <h1 className="font-display text-3xl font-bold">Confirm your team / Bekräfta ditt lag</h1>
    {loading ? <p role="status">Opening invitation…</p> : error && !invitation ? <div className="space-y-3"><p role="alert" className="text-destructive">{error}</p><Button asChild variant="outline"><Link to="/ask">Contact the General</Link></Button></div> : invitation ? <>
      <div className="space-y-2 border-y border-border py-5">
        <p className="text-sm font-semibold text-primary">Motionsserien {invitation.tournament}</p>
        <h2 className="font-display text-2xl font-bold break-words">{invitation.teamName}</h2>
        <p className="break-words">{invitation.playerName} &amp; {invitation.partnerName}</p>
      </div>
      {invitation.confirmed ? <div className="space-y-3" role="status">
        <CheckCircle2 className="size-7 text-up" aria-hidden="true" />
        <h2 className="text-xl font-bold">Your confirmation is received / Din bekräftelse har tagits emot</h2>
        <p>{invitation.bothConfirmed ? "Both players have confirmed the team formation. The admin will review the tournament registration." : "Your partner still needs to confirm before the team formation is confirmed."}</p>
        <p className="text-sm text-muted-foreground">{invitation.bothConfirmed ? "Båda spelarna har bekräftat lagbildningen. Administratören granskar anmälan till turneringen." : "Din partner måste också bekräfta innan lagbildningen är bekräftad."}</p>
      </div> : <div className="space-y-4">
        <p>Confirm that you agree to play with {invitation.partnerName} in this team. Both players must confirm.</p>
        <p className="text-sm text-muted-foreground">Bekräfta att du vill spela med {invitation.partnerName} i detta lag. Båda spelarna måste bekräfta.</p>
        <Button disabled={busy} className="h-auto whitespace-normal" onClick={async () => {
          setBusy(true); setError("");
          try { const result = await confirm({ data: { token } }); setInvitation({ ...invitation, ...result }); }
          catch (e) { setError(e instanceof Error ? e.message : "Unable to confirm."); }
          finally { setBusy(false); }
        }}>{busy ? "Confirming…" : "Confirm my team / Bekräfta mitt lag"}</Button>
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
      </div>}
      <p>Once your team is confirmed, please complete the payment if you have not already paid. <Link to="/register" className="text-primary underline">Payment information is available on the website.</Link></p>
      <p className="text-sm text-muted-foreground">När laget är bekräftat, slutför betalningen om du inte redan har betalat. Betalningsinformation finns på webbplatsens anmälningssida.</p>
      <RegistrationEmailReminder />
    </> : null}
  </section>;
}