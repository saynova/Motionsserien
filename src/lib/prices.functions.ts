import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";

export type SitePrices = { shuttlePrice: number; registrationPrice: number };
const DEFAULTS: SitePrices = { shuttlePrice: 135, registrationPrice: 800 };

export const getSitePrices = createServerFn({ method: "GET" }).handler(async (): Promise<SitePrices> => {
  try {
    const { adminClient } = await import("./tournament.server");
    const { data } = await adminClient()
      .from("site_support_settings")
      .select("shuttle_price, registration_price")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data ? { shuttlePrice: data.shuttle_price, registrationPrice: data.registration_price } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
});

export const sitePricesQueryOptions = queryOptions({
  queryKey: ["site-prices"],
  queryFn: () => getSitePrices(),
});

export const setSitePrices = createServerFn({ method: "POST" })
  .inputValidator((d: SitePrices) => {
    const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 100000;
    if (!ok(d?.shuttlePrice) || !ok(d?.registrationPrice)) throw new Error("Enter whole kronor between 0 and 100 000.");
    return { shuttlePrice: d.shuttlePrice, registrationPrice: d.registrationPrice };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();
    const existing = await client.from("site_support_settings").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    const payload = { shuttle_price: data.shuttlePrice, registration_price: data.registrationPrice };
    const result = existing.data
      ? await client.from("site_support_settings").update(payload).eq("id", existing.data.id)
      : await client.from("site_support_settings").insert(payload);
    if (result.error) throw new Error(result.error.message);
    return { ok: true as const };
  });
