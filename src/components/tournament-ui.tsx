import { ArrowDown, ArrowUp, Minus, Sparkles, Trophy, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { bannerQueryOptions } from "@/lib/tournament-query";

import { cn } from "@/lib/utils";
import type { MatchRow, Movement } from "@/lib/tournament";
import { formatScore, isNoShow } from "@/lib/tournament";

export function MovementBadge({ movement, nextDivision }: { movement: Movement; nextDivision: number }) {
  const map = {
    up: { Icon: ArrowUp, label: `Up to Div ${nextDivision}`, cls: "text-up border-up/40 bg-up/10" },
    down: { Icon: ArrowDown, label: `Down to Div ${nextDivision}`, cls: "text-down border-down/40 bg-down/10" },
    stay: { Icon: Minus, label: "Stays", cls: "text-hold border-border bg-muted/50" },
  } as const;
  const { Icon, label, cls } = map[movement];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        cls,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

export function StatusPill({ match }: { match: MatchRow }) {
  if (match.status === "final") {
    return isNoShow(match) ? (
      <span className="rounded border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        No show
      </span>
    ) : (
      <span className="rounded border border-up/40 bg-up/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-up">
        Final
      </span>
    );
  }
  if (match.status === "pending") {
    return (
      <span className="rounded border border-accent/50 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
        Awaiting approval
      </span>
    );
  }
  return (
    <span className="rounded border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      Scheduled
    </span>
  );
}

export function ScoreText({ match }: { match: MatchRow }) {
  return <span className="tabnum text-sm font-semibold">{formatScore(match)}</span>;
}

export function DivisionBanner({
  division,
  court,
  time,
  right,
}: {
  division: number;
  court: number;
  time: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold uppercase tracking-wider text-primary">
          Division {division}
        </h2>
        <span className="tabnum text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {time} · Court {court}
        </span>
      </div>
      {right}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-border pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      <h1 className="mt-1 text-4xl font-bold uppercase tracking-wide sm:text-5xl">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}

export function WeeklyBanner() {
  const { data } = useQuery(bannerQueryOptions);
  if (!data || !data.is_active || data.title.trim() === "") return null;
  return (
    <section
      aria-label="Weekly announcement"
      className="weekly-banner relative mb-8 overflow-hidden rounded-lg border border-banner-border bg-banner px-5 py-5 shadow-lg sm:px-7 sm:py-6"
    >
      <div className="weekly-banner-shine" aria-hidden="true" />
      <div className="relative flex items-center gap-4 sm:gap-6">
        <div className="weekly-trophy-wrap relative flex size-16 shrink-0 items-center justify-center sm:size-20" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border border-banner-gold/40 bg-banner-gold-soft" />
          <span className="absolute inset-1.5 rounded-full border border-banner-gold/20" />
          <Trophy className="weekly-trophy relative size-8 text-banner-gold sm:size-10" strokeWidth={1.7} />
          <Sparkles className="weekly-sparkle absolute -right-1 top-0 size-5 text-banner-gold" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-banner-gold">
            <span className="h-px w-5 bg-banner-gold/60" aria-hidden="true" />
            Weekly announcement
          </p>
          <h2 className="font-display text-3xl font-bold leading-none tracking-wide text-banner-foreground sm:text-4xl">
            {data.title}
          </h2>
          {data.message.trim() !== "" ? (
            <p className="mt-2 max-w-3xl whitespace-pre-line text-base font-medium leading-relaxed text-banner-muted sm:text-lg">
              {data.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ContactBar() {
  return (
    <section
      aria-label="Contact"
      className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <UserRound className="size-5 text-primary" aria-hidden="true" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Contact · The General
          </p>
          <p className="text-sm font-bold uppercase tracking-wide">Md Rabiul Islam</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Questions about schedules, results or shuttles? Reach out to the General.
      </p>
    </section>
  );
}
