// Capture and remove authentication credentials before any backend client or
// route code initializes in the browser.
import "@/lib/auth-url-callback";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { brandingQueryOptions, DEFAULT_BRANDING } from "@/lib/branding.functions";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
// Keeps browser calls to the backend on this domain (restricted office networks
// block the backend's own address). Must load before the client is used.
import { initSameOriginRelay } from "@/integrations/supabase/same-origin";

initSameOriginRelay();

import { supabase } from "@/integrations/supabase/client";
import { consumeAuthSessionFromUrl } from "@/lib/auth-url-session";


import { Toaster } from "@/components/ui/sonner";
import { DonationButton, SponsorBanner } from "@/components/support-ui";
import { ContactBar, WeeklyBanner } from "@/components/tournament-ui";
import { logVisit } from "@/lib/visitors.functions";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => {
    await consumeAuthSessionFromUrl();
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Motionsserien HT-26 — Badminton Ladder" },
      {
        name: "description",
        content:
          "Weekly badminton ladder for Motionsserien HT-26: standings, court schedule, score submission and division movement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "64x64" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Standings" },
  { to: "/progress", label: "Progress" },
  { to: "/shuttles", label: "Shuttles" },
  { to: "/register", label: "Register" },
  { to: "/memories", label: "Photos" },
  { to: "/ask", label: "Contact" },
  { to: "/admin", label: "Admin" },
] as const;

function useBrandedTitle() {
  const { data } = useQuery(brandingQueryOptions());
  const name = data?.tournamentName ?? DEFAULT_BRANDING.tournamentName;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const apply = () => {
      if (document.title.includes(DEFAULT_BRANDING.tournamentName) && name !== DEFAULT_BRANDING.tournamentName) {
        document.title = document.title.split(DEFAULT_BRANDING.tournamentName).join(name);
      }
    };
    apply();
    const t = window.setTimeout(apply, 50);
    return () => window.clearTimeout(t);
  }, [name, pathname]);
}

function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSignedIn(!!session);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <Link
      to={signedIn ? "/account" : "/auth"}
      className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary sm:text-sm"
    >
      {signedIn ? "My account" : "Sign in"}
    </Link>
  );
}

function SiteHeader() {
  const { data } = useQuery(brandingQueryOptions());
  const brand = data ?? DEFAULT_BRANDING;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[96rem] px-3 py-3 sm:px-5 lg:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link to="/" className="col-start-1 row-start-1 flex min-w-0 items-baseline gap-1.5 sm:gap-2 lg:col-start-1">
            <span className="font-display text-xl font-bold text-primary sm:text-2xl">
              {brand.headerTitle}
            </span>
            {brand.headerSubtitle ? (
              <span className="shrink-0 font-display text-xl font-bold text-foreground sm:text-2xl">{brand.headerSubtitle}</span>
            ) : null}
          </Link>
          <nav className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center justify-center gap-1 lg:col-span-1 lg:col-start-2 lg:row-start-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-2.5 sm:text-sm"
                activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/15" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 lg:col-start-3">
            {brand.showSignIn ? <AccountLink /> : null}
            <DonationButton />
          </div>

        </div>
      </div>
    </header>
  );
}

let lastLoggedPath = "";

function VisitLogger() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (lastLoggedPath === pathname) return;
    lastLoggedPath = pathname;
    void logVisit({ data: { path: pathname } }).catch(() => {});
  }, [pathname]);

  return null;
}

function TitleSync() {
  useBrandedTitle();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const isAdmin = useRouterState({
    select: (state) => state.location.pathname.startsWith("/admin"),
  });

  if (isAdmin) {
    return (
      <QueryClientProvider client={queryClient}>
        <TitleSync />
        <Outlet />
        <Toaster position="top-center" />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <VisitLogger />
      <TitleSync />
      <div className="flex min-h-dvh w-full flex-col overflow-x-clip">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[96rem] flex-1 px-3 py-5 sm:px-5 sm:py-8 lg:px-8">
          <SponsorBanner />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <ContactBar />
        </main>
        <footer className="mx-auto w-full max-w-[96rem] px-3 pb-8 text-xs leading-relaxed text-muted-foreground sm:px-5 lg:px-8">
          Mondays · Divisions 1–5 at 19:00, Divisions 6–10 at 20:00 · Please arrive 10 minutes
          before your start time. ·{" "}
          <Link to="/terms" className="font-semibold text-primary underline">
            Terms &amp; Conditions
          </Link>
        </footer>
      </div>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
