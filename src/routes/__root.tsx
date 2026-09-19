import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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
  { to: "/schedule", label: "Schedule" },
  { to: "/progress", label: "Progress" },
  { to: "/shuttles", label: "Shuttles" },
  { to: "/register", label: "Register" },
  { to: "/ask", label: "Contact" },
  { to: "/admin", label: "Admin" },
] as const;

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border-b border-border bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[96rem] items-center justify-center px-3 py-1 sm:justify-end sm:px-5 lg:px-8">
        <span className="tabnum text-[11px] font-semibold tracking-wide text-muted-foreground sm:text-xs">
          {now
            ? now.toLocaleString("sv-SE", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "\u00A0"}
        </span>
      </div>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[96rem] px-3 py-3 sm:px-5 lg:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link to="/" className="col-start-1 row-start-1 flex min-w-0 items-baseline gap-1.5 sm:gap-2 lg:col-start-1">
            <span className="font-display text-xl font-bold text-primary sm:text-2xl">
              Motionsserien
            </span>
            <span className="shrink-0 font-display text-xl font-bold text-foreground sm:text-2xl">HT-26</span>
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
          <div className="col-start-2 row-start-1 shrink-0 lg:col-start-3">
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <VisitLogger />
      <div className="flex min-h-dvh w-full flex-col overflow-x-clip">
        <LiveClock />
        <SiteHeader />
        <main className="mx-auto w-full max-w-[96rem] flex-1 px-3 py-5 sm:px-5 sm:py-8 lg:px-8">
          <WeeklyBanner />
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
