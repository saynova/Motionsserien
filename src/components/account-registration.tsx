import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getMyAccount, registerMyTeam, requestPartner } from "@/lib/account.functions";
import { submitRegistration } from "@/lib/registration.functions";
import { registrationInfoQueryOptions } from "@/lib/tournament-query";
import { DIVISION_COUNT } from "@/lib/tournament";
import { Skeleton } from "@/components/ui/skeleton";

function FormSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm" aria-busy="true" aria-label="Loading form">
      <Skeleton className="h-6 w-1/2" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

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

export function AccountRegistration() {
  const signed = useSignedIn();
  const info = useQuery(registrationInfoQueryOptions);
  if (signed === "loading" || info.isLoading) return <FormSkeleton />;
  if (signed === "out") {
    if (info.data?.requireSignIn === false) return <GuestRegistration />;
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Sign in to register</h2>
        <p className="text-sm text-muted-foreground">
          You need a player account to register a team or to ask us to find you a partner. The same account works for scores and receipts in every future tournament.
        </p>
        <Link to="/auth" className="inline-block rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          Sign in or create account
        </Link>
      </div>
    );
  }
  return <SignedInRegistration />;
}

function GuestRegistration() {
  const doSubmit = useServerFn(submitRegistration);
  const [teamName, setTeamName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p2Email, setP2Email] = useState("");
  const [p2Phone, setP2Phone] = useState("");
  const [swishRef, setSwishRef] = useState("");
  const [payLater, setPayLater] = useState(false);
  const [division, setDivision] = useState("new");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-card p-5 text-sm">
        <h2 className="text-lg font-bold">Thanks — your team is registered</h2>
        <p>The admin reviews every entry. Once approved, your team appears under Approved teams.</p>
        <p className="text-muted-foreground">
          Create an account later with the same email and your team, scores and receipts will be linked automatically.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await doSubmit({
            data: {
              teamName,
              player1Name: name,
              player1Email: email,
              player2Name: p2Name,
              player2Email: p2Email,
              phone,
              player2Phone: p2Phone,
              swishRef,
              payLater,
              lateCancelAck: true,
              previousDivision: division,
            },
          });
          toast.success("Team registered. The admin will review it.");
          setDone(true);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <h2 className="text-lg font-bold">Register a team</h2>
        <p className="text-xs text-muted-foreground">
          No account needed. If you already have one, you can{" "}
          <Link to="/auth" className="font-semibold text-primary underline">sign in</Link> instead.
        </p>
      </div>
      <div>
        <label className={label}>Team name</label>
        <input className={field} value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
      </div>
      <div>
        <label className={label}>Player 1 name</label>
        <input className={field} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className={label}>Player 1 email</label>
        <input className={field} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
        <span>
          I have read and accept the <Link to="/terms" className="font-semibold text-primary underline">Terms &amp; Conditions</Link>.
        </span>
      </label>
      <button type="submit" disabled={busy || !accepted} className="w-full rounded bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-40">
        {busy ? "Sending…" : "Register team"}
      </button>
      <div className="space-y-1 rounded border-2 border-destructive bg-destructive/10 p-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-destructive">Late Cancellation</h3>
        <p className="text-sm font-medium text-destructive">If a team cancels late and does not provide a replacement team, an invoice of 800 SEK may be issued to the registered team.</p>
      </div>
    </form>
  );
}



function SignedInRegistration() {
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const doRegister = useServerFn(registerMyTeam);
  const doPartner = useServerFn(requestPartner);
  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });

  const [mode, setMode] = useState<"team" | "partner">("team");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [phone, setPhone] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p2Email, setP2Email] = useState("");
  const [p2Phone, setP2Phone] = useState("");
  const [swishRef, setSwishRef] = useState("");
  const [payLater, setPayLater] = useState(false);
  const [division, setDivision] = useState("new");
  const [availability, setAvailability] = useState("");
  const [note, setNote] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = account.data?.registration.key;
  const current = account.data?.teams.find((t) => t.seasonKey === key);
  const partner = account.data?.partnerRequest;
  const activePartner = partner && !["withdrawn", "rejected"].includes(partner.status);

  if (account.isLoading) return <FormSkeleton />;
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
    ["partner", "Find me a partner"],
  ] as const;

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (mode === "team")
          void run(() => doRegister({ data: { teamName, playerName: name, phone, player2Name: p2Name, player2Email: p2Email, player2Phone: p2Phone, swishRef, payLater, lateCancelAck: true, previousDivision: division } }), "Team registered. The admin will review it and you will appear under Approved teams once approved.");
        else
          void run(() => doPartner({ data: { name, previousDivision: division, availability, note } }), "Request sent. The admin will review it.");
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded bg-secondary p-1 text-xs font-semibold">
        {tabs.map(([id, text]) => (
          <button key={id} type="button" onClick={() => setMode(id)} className={`rounded px-2 py-1.5 ${mode === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {text}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Signed in as {account.data?.email}. This email is used for your registration.</p>
      {mode === "team" ? (
        <div>
          <label className={label}>Team name</label>
          <input className={field} value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
        </div>
      ) : null}
      <div>
        <label className={label}>{mode === "team" ? "Player 1 name (you)" : "Your name"}</label>
        <input className={field} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      {mode === "team" ? (
        <>
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
          <p className="text-xs text-muted-foreground">

            You are Player 1 (your account email is used). Player 2 can later sign in with the email above to see the team. The team appears under Approved teams and on the seeding board only after admin approval.
          </p>
        </>
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
        {busy ? "Sending…" : mode === "team" ? "Register team" : "Send request"}
      </button>
      {mode === "team" ? (
        <div className="space-y-1 rounded border-2 border-destructive bg-destructive/10 p-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-destructive">Late Cancellation</h3>
          <p className="text-sm font-medium text-destructive">If a team cancels late and does not provide a replacement team, an invoice of 800 SEK may be issued to the registered team.</p>
        </div>
      ) : null}

    </form>
  );
}
