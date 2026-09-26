import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getMyAccount, joinTeam, listJoinableTeams, registerMyTeam, requestPartner } from "@/lib/account.functions";
import { DIVISION_COUNT } from "@/lib/tournament";

const field = "w-full rounded border border-input bg-card px-3 py-2 text-sm font-medium";
const label = "mb-1 block text-xs uppercase tracking-widest text-muted-foreground";

function useSignedIn() {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState(data.session ? "in" : "out"));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setState(s ? "in" : "out"));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

function DivisionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="new">New Team (did not play last session)</option>
      {Array.from({ length: DIVISION_COUNT }, (_, i) => i + 1).map((d) => (
        <option key={d} value={d}>Division {d}</option>
      ))}
    </select>
  );
}

export function AccountRegistration({ paymentDetails }: { paymentDetails: string }) {
  const signed = useSignedIn();
  if (signed === "loading") return <div className="rounded-lg border border-border bg-card p-4 text-sm">Loading…</div>;
  if (signed === "out") {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Sign in to register</h2>
        <p className="text-sm text-muted-foreground">
          You need a player account to register a team, join your partner or find a partner. The same account works for scores and receipts in every future tournament.
        </p>
        <Link to="/auth" className="inline-block rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          Sign in or create account
        </Link>
      </div>
    );
  }
  return <SignedInRegistration paymentDetails={paymentDetails} />;
}

function SignedInRegistration({ paymentDetails }: { paymentDetails: string }) {
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchJoinable = useServerFn(listJoinableTeams);
  const doRegister = useServerFn(registerMyTeam);
  const doJoin = useServerFn(joinTeam);
  const doPartner = useServerFn(requestPartner);
  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const joinable = useQuery({ queryKey: ["joinable-teams"], queryFn: () => fetchJoinable() });

  const [mode, setMode] = useState<"team" | "join" | "partner">("team");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [phone, setPhone] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p2Email, setP2Email] = useState("");
  const [p2Phone, setP2Phone] = useState("");
  const [swishRef, setSwishRef] = useState("");
  const [payLater, setPayLater] = useState(false);
  const [lateAck, setLateAck] = useState(false);
  const [division, setDivision] = useState("new");
  const [joinId, setJoinId] = useState("");
  const [availability, setAvailability] = useState("");
  const [note, setNote] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = account.data?.registration.key;
  const current = account.data?.teams.find((t) => t.seasonKey === key);
  const partner = account.data?.partnerRequest;
  const activePartner = partner && !["withdrawn", "rejected"].includes(partner.status);

  if (account.isLoading) return <div className="rounded-lg border border-border bg-card p-4 text-sm">Loading…</div>;
  if (account.error) return <div className="rounded-lg border border-border bg-card p-4 text-sm text-destructive">{(account.error as Error).message}</div>;

  if (current || activePartner) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-card p-5 text-sm">
        <h2 className="text-lg font-bold">You're registered</h2>
        {current ? (
          <p>
            Team <strong>{current.teamName}</strong> ({current.player1Name}
            {current.player2Name ? ` & ${current.player2Name}` : ""}).
          </p>
        ) : (
          <p>Your "Find a partner" request is on the list.</p>
        )}
        <Link to="/account" className="font-semibold text-primary underline">See status on My account</Link>
      </div>
    );
  }

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    ["team", "Register a team"],
    ["join", "Join my partner's team"],
    ["partner", "Find me a partner"],
  ] as const;

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (mode === "team")
          void run(() => doRegister({ data: { teamName, playerName: name, phone, player2Name: p2Name, player2Email: p2Email, player2Phone: p2Phone, swishRef, payLater, lateCancelAck: lateAck, previousDivision: division } }), "Team registered. The admin will review it and you will appear under Approved teams once approved.");
        else if (mode === "join")
          void run(() => doJoin({ data: { registrationId: joinId, playerName: name } }), "You've joined the team.");
        else
          void run(() => doPartner({ data: { name, previousDivision: division, availability, note } }), "Request sent. The admin will review it.");
      }}
    >
      <div className="grid grid-cols-3 gap-1 rounded bg-secondary p-1 text-xs font-semibold">
        {tabs.map(([id, text]) => (
          <button key={id} type="button" onClick={() => setMode(id)} className={`rounded px-2 py-1.5 ${mode === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {text}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Signed in as {account.data?.email}. This email is used for your registration.</p>
      <div>
        <label className={label}>{mode === "team" ? "Player 1 name (you)" : "Your name"}</label>
        <input className={field} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      {mode === "team" ? (
        <>
          <div>
            <label className={label}>Team name</label>
            <input className={field} value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Player 1 phone number</label>
            <input className={field} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Player 2 name</label>
            <input className={field} autoComplete="off" value={p2Name} onChange={(e) => setP2Name(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Player 2 email</label>
            <input className={field} type="email" autoComplete="off" value={p2Email} onChange={(e) => setP2Email(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Player 2 phone number</label>
            <input className={field} type="tel" autoComplete="off" value={p2Phone} onChange={(e) => setP2Phone(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Division last session (1–10) or New Team</label>
            <DivisionSelect value={division} onChange={setDivision} />
          </div>
          <div className="space-y-2 rounded border border-border bg-secondary/40 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment information</h3>
            <p className="text-xs text-muted-foreground">
              Pay with Swish first (details below), then enter the Swish reference number from the app. If you haven't paid yet, choose "I will pay later" — the admin will mark your team as paid once the payment arrives.
            </p>
            <label className={label}>Swish reference number</label>
            <input
              className={field}
              inputMode="numeric"
              placeholder="e.g. 8382 73323 8287382"
              value={swishRef}
              disabled={payLater}
              onChange={(e) => setSwishRef(e.target.value.replace(/[^\d ]/g, ""))}
              required={!payLater}
              pattern="[0-9 ]{4,}"
              title="Numbers only"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={payLater} onChange={(e) => { setPayLater(e.target.checked); if (e.target.checked) setSwishRef(""); }} className="h-4 w-4 accent-primary" />
              I will pay later
            </label>
          </div>
          <div className="space-y-2 rounded border border-destructive/40 bg-destructive/5 p-3">
            <h3 className="text-sm font-bold">Late Cancellation</h3>
            <p className="text-sm">If a team cancels late and does not provide a replacement team, an invoice of 800 SEK may be issued to the registered team.</p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={lateAck} onChange={(e) => setLateAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" required />
              I have read and understand the late cancellation policy.
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            You are Player 1 (your account email is used). Player 2 can later sign in with the email above to see the team. The team appears under Approved teams and on the seeding board only after admin approval.
          </p>
        </>
      ) : null}

      {mode === "join" ? (
        <div>
          <label className={label}>Your partner's team</label>
          <select className={field} value={joinId} onChange={(e) => setJoinId(e.target.value)} required>
            <option value="">Choose team…</option>
            {(joinable.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.teamName} ({t.player1Name})</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">Only teams still missing a second player are listed. Your partner gets an email when you join.</p>
        </div>
      ) : null}

      {mode === "partner" ? (
        <>
          <div>
            <label className={label}>Your level (previous division)</label>
            <DivisionSelect value={division} onChange={setDivision} />
          </div>
          <div>
            <label className={label}>Availability</label>
            <input className={field} value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. every Monday" />
          </div>
          <div>
            <label className={label}>Note (optional)</label>
            <textarea className={field} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Only the admin sees this. Once approved, the admin pairs you with another player and you'll get an email.</p>
        </>
      ) : null}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
        <span>
          I have read and accept the <Link to="/terms" className="font-semibold text-primary underline">Terms &amp; Conditions</Link>.
        </span>
      </label>
      <button type="submit" disabled={busy || !accepted} className="w-full rounded bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-40">
        {busy ? "Sending…" : mode === "team" ? "Register team" : mode === "join" ? "Join team" : "Send request"}
      </button>
      {paymentDetails ? (
        <div className="rounded border border-border bg-secondary/40 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment details</h3>
          <p className="mt-1 whitespace-pre-line text-sm">{paymentDetails}</p>
        </div>
      ) : null}
    </form>
  );
}
