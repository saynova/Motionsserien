import { createServerFn } from "@tanstack/react-start";

const TOPICS = ["question", "feedback", "scoring", "other"] as const;
export type MessageTopic = (typeof TOPICS)[number];

export type Message = {
  id: string;
  topic: MessageTopic;
  email: string;
  name: string;
  team_name: string;
  body: string;
  status: "new" | "answered";
  created_at: string;
  reply_body: string | null;
  replied_at: string | null;
};

const MESSAGE_COLUMNS =
  "id, topic, email, name, team_name, body, status, created_at, reply_body, replied_at";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeTopic(value: unknown): MessageTopic {
  const topic = typeof value === "string" ? value.toLowerCase().trim() : "question";
  return TOPICS.includes(topic as MessageTopic) ? (topic as MessageTopic) : "question";
}

// ---------------------------------------------------------------- public submit

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((data: { topic?: string; email?: string; name?: string; teamName?: string; body?: string }) => {
    const email = (data?.email ?? "").trim();
    const body = (data?.body ?? "").trim();
    const name = (data?.name ?? "").trim();
    const teamName = (data?.teamName ?? "").trim();

    if (!isValidEmail(email) || email.length > 255) {
      throw new Error("Enter a valid email address.");
    }
    if (body.length < 5 || body.length > 2000) {
      throw new Error("Message must be between 5 and 2000 characters.");
    }
    if (name.length > 80) {
      throw new Error("Name must be 80 characters or less.");
    }
    if (teamName.length > 80) {
      throw new Error("Team name must be 80 characters or less.");
    }

    return {
      topic: sanitizeTopic(data?.topic),
      email,
      name,
      teamName,
      body,
    };
  })
  .handler(async ({ data }) => {
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient().from("messages").insert({
      topic: data.topic,
      email: data.email,
      name: data.name,
      team_name: data.teamName,
      body: data.body,
      status: "new",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------------------------------------------------------------- admin inbox

export const listMessages = createServerFn({ method: "POST" }).handler(async (): Promise<Message[]> => {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
  const { adminClient } = await import("./tournament.server");
  const { data, error } = await adminClient()
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
});

type StatusInput = { messageId: string; status: "new" | "answered" };

export const setMessageStatus = createServerFn({ method: "POST" })
  .inputValidator((data: StatusInput) => {
    if (typeof data?.messageId !== "string" || data.messageId.length < 10) {
      throw new Error("Message ID is required.");
    }
    if (data?.status !== "new" && data?.status !== "answered") {
      throw new Error("Invalid status.");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient().from("messages").update({ status: data.status }).eq("id", data.messageId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

type ReplyInput = { messageId: string; replyBody: string };

export const replyToMessage = createServerFn({ method: "POST" })
  .inputValidator((data: ReplyInput) => {
    if (typeof data?.messageId !== "string" || data.messageId.length < 10) {
      throw new Error("Message ID is required.");
    }
    const replyBody = (data?.replyBody ?? "").trim();
    if (replyBody.length < 2 || replyBody.length > 4000) {
      throw new Error("Reply must be between 2 and 4000 characters.");
    }
    return { messageId: data.messageId, replyBody };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { translateEmailBodyToSwedish } = await import("./translate-email.server");
    const client = adminClient();

    const message = await client
      .from("messages")
      .select("id, email, name, body")
      .eq("id", data.messageId)
      .maybeSingle();
    if (message.error) throw new Error(message.error.message);
    if (!message.data) throw new Error("Message not found.");

    const swedishReply = await translateEmailBodyToSwedish(data.replyBody);
    const result = await sendTemplateEmail("message-reply", message.data.email, {
      templateData: {
        name: message.data.name,
        englishReply: data.replyBody,
        swedishReply,
        originalBody: message.data.body,
      },
      idempotencyKey: `message-reply-${message.data.id}-${data.replyBody.length}-${crypto.randomUUID().slice(0, 8)}`,
    });

    const { error } = await client
      .from("messages")
      .update({ reply_body: data.replyBody, replied_at: new Date().toISOString(), status: "answered" })
      .eq("id", data.messageId);
    if (error) throw new Error(error.message);

    return { ok: true as const, sent: result.sent };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .inputValidator((data: { messageId: string }) => {
    if (typeof data?.messageId !== "string" || data.messageId.length < 10) {
      throw new Error("Message ID is required.");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { error } = await adminClient().from("messages").delete().eq("id", data.messageId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
