import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImagePlus, MessageSquare, X } from "lucide-react";

import { PageHeader } from "@/components/tournament-ui";
import { supabase } from "@/integrations/supabase/client";
import {
  createMessageAttachmentUpload,
  sendMessage,
  type MessageTopic,
} from "@/lib/messages.functions";


export const Route = createFileRoute("/ask")({
  head: () => ({
    meta: [
      { title: "Ask the General — Motionsserien HT-26" },
      {
        name: "description",
        content:
          "Send questions, feedback or scoring issues to the General for Motionsserien HT-26.",
      },
      {
        name: "keywords",
        content:
          "Motionsserien contact, ask the General, Md Rabiul Islam badminton, kontakt Motionsserien, badminton Ludvika contact",
      },
      { property: "og:title", content: "Ask the General — Motionsserien HT-26" },
      {
        property: "og:description",
        content: "Send questions, feedback or scoring issues to the General.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.motionsserien.se/ask" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.motionsserien.se/ask" }],
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

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** Keeps full detail: only very large photos are scaled down before sending. */
async function preparePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Could not read that photo. Use a JPEG, PNG or WebP picture.");
  });
  const max = 3000;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process the photo.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process the photo."))),
      "image/jpeg",
      0.92,
    ),
  );
}

function AskPage() {
  const submit = useServerFn(sendMessage);
  const getUploadSlot = useServerFn(createMessageAttachmentUpload);
  const [topic, setTopic] = useState<MessageTopic>("question");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only photos can be attached.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("That photo is larger than 10 MB. Please pick a smaller one.");
      return;
    }
    setPhoto(file);
  }

  function clearPhoto() {
    setPhoto(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      let attachmentPath: string | null = null;
      if (photo) {
        const blob = await preparePhoto(photo);
        const slot = await getUploadSlot({ data: { ext: "jpg" } });
        const { error } = await supabase.storage
          .from("message-attachments")
          .uploadToSignedUrl(slot.path, slot.token, blob, { contentType: "image/jpeg" });
        if (error) throw new Error("The photo could not be sent. Please try again.");
        attachmentPath = slot.path;
      }
      await submit({ data: { topic, email, name, teamName, body, attachmentPath } });
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
              name="name"
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
              name="team"
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
