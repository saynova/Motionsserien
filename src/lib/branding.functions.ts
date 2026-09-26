import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";

export type SiteBranding = { headerTitle: string; headerSubtitle: string; tournamentName: string; showSignIn: boolean; showMissingBanner: boolean };

export const DEFAULT_BRANDING: SiteBranding = {
  headerTitle: "Motionsserien",
  headerSubtitle: "HT-26",
  tournamentName: "Motionsserien HT-26",
  showSignIn: true,
  showMissingBanner: true,
};

export const getBranding = createServerFn({ method: "GET" }).handler(async (): Promise<SiteBranding> => {
  try {
    const { adminClient } = await import("./tournament.server");
    const { data } = await adminClient()
      .from("site_branding")
      .select("header_title, header_subtitle, tournament_name, show_signin, show_missing_banner")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!data) return DEFAULT_BRANDING;
    return {
      headerTitle: data.header_title || DEFAULT_BRANDING.headerTitle,
      headerSubtitle: data.header_subtitle,
      tournamentName: data.tournament_name || DEFAULT_BRANDING.tournamentName,
      showSignIn: data.show_signin !== false,
      showMissingBanner: data.show_missing_banner !== false,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
});


export const brandingQueryOptions = () =>
  queryOptions({ queryKey: ["site-branding"], queryFn: () => getBranding(), staleTime: 60_000 });

export const saveBranding = createServerFn({ method: "POST" })
  .inputValidator((input: SiteBranding) => {
    const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
    const out = {
      headerTitle: clean(input?.headerTitle, 60),
      headerSubtitle: clean(input?.headerSubtitle, 40),
      tournamentName: clean(input?.tournamentName, 100),
      showSignIn: input?.showSignIn !== false,
      showMissingBanner: input?.showMissingBanner !== false,
    };

    if (out.headerTitle.length < 2) throw new Error("Header title needs at least 2 characters.");
    if (out.tournamentName.length < 2) throw new Error("Tournament name needs at least 2 characters.");
    return out;
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { adminClient } = await import("./tournament.server");
    const client = adminClient();
    const existing = await client.from("site_branding").select("id").order("created_at").limit(1).maybeSingle();
    const payload = {
      header_title: data.headerTitle,
      header_subtitle: data.headerSubtitle,
      tournament_name: data.tournamentName,
      show_signin: data.showSignIn,
    };

    const res = existing.data
      ? await client.from("site_branding").update(payload).eq("id", existing.data.id)
      : await client.from("site_branding").insert(payload);
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const };
  });
