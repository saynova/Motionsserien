import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

import { PageHeader } from "@/components/tournament-ui";
import { sendMessage, type MessageTopic } from "@/lib/messages.functions";

export const Route = createFileRoute("/ask")({
  head: () => ({
    meta: [
      { title: "Ask the General — Motionsserien HT-26" },
      {
        name: "description",
        content:
          "Send questions, feedback or scoring issues to the General for Motionsserien HT-26.",
      },
      { property: "og:title", content: "Ask the General — Motionsserien HT-26" },
      {
        property: "og:description",
        content: "Send questions, feedback or scoring issues to the General.",
      },
    ],
  }),
  component: AskPage,
});

const TOPICS: { value: MessageTopic; label: string }[] = [
  { value: "question", label: "Question" },
  { value: "feedback", label: "Feedback" },
  { value: "scoring", label: "Scoring issue" },
  { value: "other", label: "Other" },
];

const control =
  "rounded border border-input bg-card px-3 py-2 text-sm font-medium text-foreground";
const label = "block text-xs font-semibold uppercase tracking-widest text-muted-foreground";
const btn =
  "rounded bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40";

function AskPage() {
  const submit = useServerFn(sendMessage);
  const [topic, setTopic] = useState<MessageTopic>("question");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await submit({ data: { topic, email, name, teamName, body } });
      setSent(true);
      toast.success("Message sent. The General will get back to you.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-center">
        <MessageSquare className="mx-auto size-10 text-primary" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold uppercase tracking-wide">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your message has been sent to the General. Replies will come to {email || "your email"}.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Ask the General"
        description="Questions, feedback or a scoring issue? Send it here and Md Rabiul Islam will get back to you."
      />
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-xl space-y-4 rounded-lg border border-border bg-card p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className={label}>Topic</span>
            <select
              className={`${control} w-full`}
              value={topic}
              onChange={(e) => setTopic(e.target.value as MessageTopic)}
            >
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={label}>Email *</span>
            <input
              type="email"
              required
              className={`${control} w-full`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className={label}>Name</span>
            <input
              type="text"
              className={`${control} w-full`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="block space-y-1">
            <span className={label}>Team name</span>
            <input
              type="text"
              className={`${control} w-full`}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className={label}>Message *</span>
          <textarea
            required
            minLength={5}
            maxLength={2000}
            rows={5}
            className={`${control} w-full resize-y`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your question or feedback here…"
          />
          <span className="text-right text-xs text-muted-foreground">{body.length}/2000</span>
        </label>
        <button type="submit" className={btn} disabled={busy}>
          {busy ? "Sending…" : "Send message"}
        </button>
      </form>
    </>
  );
}
