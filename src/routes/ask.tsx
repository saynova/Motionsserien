import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  ImagePlus,
  ListChecks,
  MessageCircleQuestion,
  MessagesSquare,
  MoreHorizontal,
  Send,
  ShieldCheck,
  ThumbsUp,
  UserRound,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
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

const TOPICS: {
  value: MessageTopic;
  label: string;
  Icon: typeof MessageCircleQuestion;
}[] = [
  { value: "question", label: "Question", Icon: MessageCircleQuestion },
  { value: "feedback", label: "Feedback", Icon: ThumbsUp },
  { value: "scoring", label: "Scoring issue", Icon: ListChecks },
  { value: "other", label: "Other", Icon: MoreHorizontal },
];

const control =
  "w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground transition-colors focus:border-primary/50";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

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

const EMPTY_FORM = {
  topic: "question" as MessageTopic,
  email: "",
  name: "",
  teamName: "",
  body: "",
};

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

  function resetForm() {
    setTopic(EMPTY_FORM.topic);
    setEmail(EMPTY_FORM.email);
    setName(EMPTY_FORM.name);
    setTeamName(EMPTY_FORM.teamName);
    setBody(EMPTY_FORM.body);
    clearPhoto();
    setSent(false);
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
      <div className="contact-ambient mx-auto max-w-xl py-10">
        <div className="contact-panel p-10 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-up/30 bg-up/10">
            <CheckCircle2 className="size-8 text-up" aria-hidden="true" />
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground">
            Thank you
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your message is on its way to the General.
            {email ? (
              <>
                {" "}
                A reply will come to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
              </>
            ) : null}
          </p>
          <p className="mt-4 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Please check your junk/spam folder to make sure you receive any further
            emails from motionsserien.se
          </p>
          <button
            type="button"
            onClick={resetForm}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessagesSquare className="size-4" aria-hidden="true" />
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-ambient">
      <header className="mx-auto mb-8 w-full max-w-3xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <MessagesSquare className="size-3.5" aria-hidden="true" />
          Contact
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Ask the General
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Questions, feedback or a scoring issue? Send it here and Md Rabiul Islam will
          get back to you.
        </p>
      </header>

      <div className="mx-auto w-full max-w-3xl">
        <form onSubmit={onSubmit} className="contact-panel space-y-6 p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
              <UserRound className="size-5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                The General
              </p>
              <p className="font-display text-base font-bold leading-tight text-foreground">
                Md Rabiul Islam
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className={labelCls}>Topic</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TOPICS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={topic === value}
                  onClick={() => setTopic(value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors",
                    topic === value
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelCls}>Email *</span>
              <input
                type="email"
                required
                className={control}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelCls}>Team name</span>
              <input
                type="text"
                name="team"
                className={control}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className={labelCls}>Your name</span>
            <input
              type="text"
              name="name"
              className={control}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <label className="block space-y-1.5">
            <span className={labelCls}>Message *</span>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={6}
              className={cn(control, "resize-y leading-relaxed")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your question or feedback here…"
            />
            <span className="block text-right text-xs font-medium text-muted-foreground">
              {body.length}/2000
            </span>
          </label>

          <div className="space-y-2.5">
            <span className={labelCls}>Photo (optional)</span>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => choosePhoto(e.target.files?.[0])}
            />
            {preview ? (
              <div className="flex items-start gap-4 rounded-lg border border-border bg-secondary/40 p-3.5">
                <img
                  src={preview}
                  alt="Photo you are attaching"
                  className="size-24 rounded-lg border border-border object-cover"
                />
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="max-w-[16rem] truncate font-semibold text-foreground">
                    {photo?.name}
                  </p>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 font-bold uppercase tracking-wide text-foreground transition-colors hover:bg-secondary"
                  >
                    <X className="size-3" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full items-center gap-3 rounded-lg border border-dashed border-input bg-secondary/30 px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/60"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <ImagePlus className="size-5 text-primary" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-foreground">
                    Add a photo
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    One picture, JPEG, PNG or WebP, up to 10 MB. Only the General can see it.
                  </span>
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-up" aria-hidden="true" />
              Private message — only the General can read it.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="size-4" aria-hidden="true" />
              {busy ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
