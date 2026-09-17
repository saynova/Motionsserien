import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/tournament-ui";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Motionsserien HT-26" },
      {
        name: "description",
        content:
          "Terms and conditions for using the Motionsserien HT-26 badminton site: scoring rules, shuttle purchases, privacy and data use, and liability.",
      },
      { property: "og:title", content: "Terms & Conditions — Motionsserien HT-26" },
      {
        property: "og:description",
        content:
          "The rules and policies for using the Motionsserien HT-26 site, including scoring, shuttle orders, privacy and liability.",
      },
    ],
  }),
  component: TermsPage,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-display text-xl font-bold uppercase tracking-wider text-primary">
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Terms"
        title="Terms & Conditions"
        description="Please read these terms before using this site. By submitting a shuttle order or a team registration, you accept them."
      />
      <p className="mb-6 text-xs uppercase tracking-widest text-muted-foreground">
        Last updated: 17 September 2026
      </p>

      <div className="space-y-6">
        <Section title="1. Tournament & scoring rules">
          <p>
            Motionsserien is a friendly weekly badminton ladder. All players are expected to play
            fair and report scores honestly.
          </p>
          <p>
            After each match you have <strong>2 days</strong> to submit the score. Any missing
            result is treated as a <strong>no-show</strong> and is recorded as{" "}
            <strong>0–0</strong>, which counts as a loss for both teams.
          </p>
          <p>
            Matches are best of 3 sets to 21 points. If the teams split the first two sets, a
            deciding third set is played to 11 points.
          </p>
          <p>
            Weekly division movement (promotion, staying, relegation) is calculated automatically
            from approved results: match wins first, then total points, then set and point
            difference. The organizer (The General) may correct mistakes, adjust divisions
            manually, and make the final decision in any dispute.
          </p>
        </Section>

        <Section title="2. Shuttle purchases">
          <p>
            Shuttle boxes cost <strong>135 kr</strong>, paid by Swish to{" "}
            <strong>1234785069, Ludvika Badmintonklubb</strong>. Please swish before or when you
            place the order.
          </p>
          <p>
            Each team may order a <strong>maximum of 1 shuttle box per two weeks</strong>. Orders
            are reviewed by an admin before they appear in the public list.
          </p>
          <p>
            Ordered shuttles are delivered <strong>every Monday at 20:00 in the Rackethall</strong>.
            An approved order is binding and is not refundable once delivered.
          </p>
        </Section>

        <Section title="3. Privacy & data use">
          <p>
            We collect only what is needed to run the tournament: team names, player names, email
            addresses, and an optional phone number.
          </p>
          <p>
            Emails are used for match reminders and replies from the organizer.{" "}
            <strong>Only team names and divisions are shown publicly.</strong> Player names,
            emails, and phone numbers are visible to the admin only and are never published.
          </p>
          <p>
            Messages sent through the Contact page and shuttle orders are stored until the
            organizer removes them.
          </p>
          <p>
            You may at any time ask to see, correct, or delete your personal data by contacting
            the organizer through the{" "}
            <Link to="/ask" className="font-semibold text-primary underline">
              Contact page
            </Link>
            .
          </p>
        </Section>

        <Section title="4. Liability & contact">
          <p>
            This site is provided as-is. The organizer is not liable for injuries, lost or damaged
            property, technical errors, or incorrect information on the site.
          </p>
          <p>
            These terms may be updated from time to time; the current version is always published
            on this page with its date.
          </p>
          <p>
            Questions, feedback, and scoring issues are handled through the{" "}
            <Link to="/ask" className="font-semibold text-primary underline">
              Contact page
            </Link>{" "}
            and answered by The General, Md Rabiul Islam.
          </p>
        </Section>
      </div>
    </>
  );
}
