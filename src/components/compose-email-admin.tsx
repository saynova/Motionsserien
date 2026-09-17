import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { divisionPlayersQueryOptions } from "@/lib/tournament-query";
import { sendGeneralEmail } from "@/lib/reminders.functions";

type Mode = "player" | "division" | "address";

const btn =
  "rounded border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70 disabled:opacity-40";
const field = "w-full rounded border border-input bg-background px-3 py-2 text-sm";
const label = "block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";

export function ComposeEmailAdmin() {
  const players = useQuery(divisionPlayersQueryOptions);
  const send = useServerFn(sendGeneralEmail);

  const [mode, setMode] = useState<Mode>("player");
  const [division, setDivision] = useState<number>(1);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const parsedAddresses = Array.from(
    new Set(
      address
        .split(/[,;\s]+/)
        .map((part) => part.trim().replace(/^<|>$/g, ""))
        .filter((part) => part.length > 0),
    ),
  );

  const rows = players.data ?? [];
  const divisions = Array.from(new Set(rows.map((r) => r.division))).sort((a, b) => a - b);
  const inDivision = rows.filter((r) => r.division === division);

  async function submit() {
    setBusy(true);
    try {
      const result = await send({
        data: {
          mode,
          division,
          email: mode === "address" ? address : email,
          subject,
          body,
        },
      });
      toast.success(
        `Email sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}.` +
          (result.suppressed > 0 ? ` ${result.suppressed} address(es) blocked.` : ""),
      );
      setSubject("");
      setBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the email.");
    } finally {
      setBusy(false);
    }
  }

  const canSend =
    subject.trim().length >= 2 &&
    body.trim().length >= 2 &&
    (mode === "division" ||
      (mode === "player" && email.length > 0) ||
      (mode === "address" && parsedAddresses.length > 0));

  return (
    <section className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-6 text-left"
      >
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wide">Send an email</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Write to one player, everyone in a division, or one or many pasted addresses. Emails go
            out as <strong>Md Rabiul Islam &lt;rabiul@motionsserien.se&gt;</strong>. Use it for
            tournament matters only.
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {!open ? null : (
        <div className="border-t border-border p-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["player", "One player"],
            ["division", "Whole division"],
            ["address", "Any address"],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              mode === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary hover:bg-secondary/70"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {mode !== "address" ? (
          <label className="space-y-1">
            <span className={label}>Division</span>
            <select
              className={field}
              value={division}
              onChange={(e) => {
                setDivision(Number(e.target.value));
                setEmail("");
              }}
            >
              {(divisions.length > 0 ? divisions : [1]).map((d) => (
                <option key={d} value={d}>
                  Division {d}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "player" ? (
          <label className="space-y-1">
            <span className={label}>Player</span>
            <select className={field} value={email} onChange={(e) => setEmail(e.target.value)}>
              <option value="">Choose a player…</option>
              {inDivision.map((p) => (
                <option key={p.email} value={p.email}>
                  {p.name || p.email} · {p.teamName}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "address" ? (
          <label className="space-y-1 sm:col-span-2">
            <span className={label}>Email addresses</span>
            <textarea
              rows={3}
              className={field}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Paste one or many addresses, separated by comma, semicolon, space or new line"
            />
            <span className="block text-xs text-muted-foreground">
              {parsedAddresses.length === 0
                ? "You can paste a whole list at once — each person gets their own separate copy."
                : `${parsedAddresses.length} address${parsedAddresses.length === 1 ? "" : "es"} ready · each gets a separate copy`}
            </span>
          </label>
        ) : null}
      </div>

      {mode === "division" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {inDivision.length} player{inDivision.length === 1 ? "" : "s"} in Division {division} have
          an email saved. Each gets their own separate copy.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <label className="block space-y-1">
          <span className={label}>Subject</span>
          <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className={label}>Message</span>
          <textarea
            rows={5}
            className={field}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message. Leave a blank line between paragraphs."
          />
        </label>
      </div>

      <button className={`${btn} mt-4`} disabled={busy || !canSend} onClick={submit}>
        <Send className="mr-1.5 inline size-3.5" aria-hidden="true" />
        {busy ? "Sending…" : "Send email"}
      </button>
        </div>
      )}
    </section>
  );
}
