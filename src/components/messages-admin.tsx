import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { messagesQueryOptions } from "@/lib/tournament-query";
import { deleteMessage, setMessageStatus } from "@/lib/messages.functions";
import type { Message, MessageTopic } from "@/lib/messages.functions";

const topicLabels: Record<MessageTopic, string> = {
  question: "Question",
  feedback: "Feedback",
  scoring: "Scoring issue",
  other: "Other",
};

const btnGhost =
  "rounded border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70 disabled:opacity-40";

export function MessagesAdmin() {
  const queryClient = useQueryClient();
  const messages = useQuery(messagesQueryOptions);
  const setStatus = useServerFn(setMessageStatus);
  const remove = useServerFn(deleteMessage);
  const [filter, setFilter] = useState<"all" | "new" | "answered">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = messages.data ?? [];
  const filtered = rows.filter((m) => (filter === "all" ? true : m.status === filter));
  const newCount = rows.filter((m) => m.status === "new").length;

  async function updateStatus(message: Message, next: "new" | "answered") {
    setBusy(message.id);
    try {
      await setStatus({ data: { messageId: message.id, status: next } });
      await queryClient.invalidateQueries({ queryKey: ["messages", "admin"] });
      toast.success(next === "answered" ? "Marked as answered." : "Marked as new.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update message.");
    } finally {
      setBusy(null);
    }
  }

  async function removeMessage(id: string) {
    if (!window.confirm("Delete this message?")) return;
    setBusy(id);
    try {
      await remove({ data: { messageId: id } });
      await queryClient.invalidateQueries({ queryKey: ["messages", "admin"] });
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete message.");
    } finally {
      setBusy(null);
    }
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wide">Ask the General</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Messages from players. {newCount} new message{newCount === 1 ? "" : "s"} waiting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "new", "answered"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary hover:bg-secondary/70"
              }`}
            >
              {f === "all" ? "All" : f === "new" ? "New" : "Answered"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No {filter === "all" ? "" : filter} messages.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {filtered.map((message) => {
            const isOpen = expanded.has(message.id);
            const date = new Date(message.created_at).toLocaleString("sv-SE", {
              dateStyle: "medium",
              timeStyle: "short",
            });
            return (
              <li
                key={message.id}
                className={`rounded border transition-colors ${
                  message.status === "new"
                    ? "border-accent/40 bg-accent/5"
                    : "border-border bg-secondary/30"
                }`}
              >
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggle(message.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2 text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          message.status === "new"
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {message.status}
                      </span>
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        {topicLabels[message.topic]}
                      </span>
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                        {message.email}
                        {message.name ? ` · ${message.name}` : ""}
                      </span>
                      {message.team_name ? (
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          ({message.team_name})
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-xs text-muted-foreground sm:inline">{date}</span>
                      {isOpen ? (
                        <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => removeMessage(message.id)}
                    disabled={busy === message.id}
                    title="Delete"
                    className="mr-2 rounded p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    aria-label="Delete message"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>

                {isOpen ? (
                  <div className="border-t border-border px-3 py-3">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {message.body}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <a
                        href={`mailto:${encodeURIComponent(message.email)}`}
                        className={btnGhost}
                      >
                        <Mail className="mr-1.5 size-3.5" aria-hidden="true" />
                        Reply by email
                      </a>
                      {message.status === "new" ? (
                        <button
                          className={btnGhost}
                          disabled={busy === message.id}
                          onClick={() => updateStatus(message, "answered")}
                        >
                          Mark answered
                        </button>
                      ) : (
                        <button
                          className={btnGhost}
                          disabled={busy === message.id}
                          onClick={() => updateStatus(message, "new")}
                        >
                          Mark as new
                        </button>
                      )}
                      <button
                        className={`${btnGhost} text-destructive hover:bg-destructive/10`}
                        disabled={busy === message.id}
                        onClick={() => removeMessage(message.id)}
                      >
                        <Trash2 className="mr-1.5 size-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
