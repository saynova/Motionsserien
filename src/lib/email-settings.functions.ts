import { createServerFn } from "@tanstack/react-start";

import { DEFAULT_EMAIL_SETTINGS } from "./email-settings.shared";
import type { EmailSettings } from "./email-settings.shared";

export const getEmailSettingsAdmin = createServerFn({ method: "POST" }).handler(
  async (): Promise<EmailSettings> => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const { getEmailSettings } = await import("./email-settings.server");
    return getEmailSettings(adminClient());
  },
);

type SaveInput = { closingEn: string; closingSv: string; signature: string };

export const saveEmailSettings = createServerFn({ method: "POST" })
  .inputValidator((data: SaveInput) => {
    const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const closingEn = clean(data?.closingEn);
    const closingSv = clean(data?.closingSv);
    const signature = clean(data?.signature);
    if (closingEn.length < 10 || closingEn.length > 1000) {
      throw new Error("The English closing sentence must be between 10 and 1000 characters.");
    }
    if (closingSv.length < 10 || closingSv.length > 1000) {
      throw new Error("The Swedish closing sentence must be between 10 and 1000 characters.");
    }
    if (signature.length < 2 || signature.length > 500) {
      throw new Error("The signature must be between 2 and 500 characters.");
    }
    return { closingEn, closingSv, signature };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();

    const existing = await client
      .from("email_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (existing.error) throw new Error(existing.error.message);

    const payload = {
      closing_en: data.closingEn,
      closing_sv: data.closingSv,
      signature: data.signature,
    };

    if (existing.data?.[0]) {
      const { error } = await client
        .from("email_settings")
        .update(payload)
        .eq("id", existing.data[0].id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await client.from("email_settings").insert(payload);
      if (error) throw new Error(error.message);
    }

    return { ok: true as const };
  });

export { DEFAULT_EMAIL_SETTINGS };
