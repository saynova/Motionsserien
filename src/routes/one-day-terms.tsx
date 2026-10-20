import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/tournament-ui";

export const Route = createFileRoute("/one-day-terms")({
  head: () => ({
    meta: [
      { title: "One-Day Tournament Terms & Conditions — Motionsserien" },
      {
        name: "description",
        content:
          "Terms for the One Day Hitachi IF Badminton Tournament: eligibility for Hitachi Energy employees, registration, fees, payment, privacy and liability.",
      },
      { property: "og:title", content: "One-Day Tournament Terms & Conditions — Motionsserien" },
      {
        property: "og:description",
        content: "Eligibility, registration, fees, payment, privacy and liability for the one-day badminton tournament.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.motionsserien.se/one-day-terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.motionsserien.se/one-day-terms" }],
  }),
  component: OnedayTermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-display text-xl font-bold uppercase tracking-wider text-primary">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

const contact = (
  <Link to="/ask" className="font-semibold text-primary underline">
    Contact page
  </Link>
);

function OnedayTermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="One-day tournament"
        title="One-Day Terms & Conditions"
        description="These terms apply only to the one-day tournament. By registering a team or sending a partner request, you accept them."
      />
      <p className="mb-6 text-xs uppercase tracking-widest text-muted-foreground">Last updated: 20 October 2026</p>

      <div className="space-y-6">
        <Section title="1. Who can take part">
          <p>
            The one-day tournament is <strong>only for Hitachi Energy employees</strong>. Both players in a team must
            register with their own Hitachi Energy work email address ending in <strong>@hitachienergy.com</strong>.
          </p>
          <p>The organizer may ask for proof of employment and may remove teams that do not meet this requirement.</p>
        </Section>

        <Section title="2. Registration & partner requests">
          <p>
            Registration closes at the deadline shown on the{" "}
            <Link to="/one-day" className="font-semibold text-primary underline">one-day page</Link>, or earlier if all
            places are taken. A team is confirmed only after the organizer approves it.
          </p>
          <p>
            Players without a partner can use "Find me a partner". The organizer may pair you with another player and
            create a team for you; placement is not guaranteed.
          </p>
          <p>
            Teams play in the Men's or Women's class. Men's teams choose Intermediate or Advanced; the organizer may
            change the level to keep the groups balanced.
          </p>
        </Section>

        <Section title="3. Fee & payment">
          <p>
            The entry fee and payment details are shown on the one-day page, directly above the submit button. The fee
            is per team.
          </p>
          <p>
            If you have not paid when registering, send your payment reference to the General through the {contact}.
            The organizer may withdraw unpaid teams before the event.
          </p>
          <p>If you need to cancel, contact the General as early as possible through the {contact}.</p>
        </Section>

        <Section title="4. Format & decisions">
          <p>
            Divisions, groups and the match format are decided by the organizer on the day. Scores are approved by the
            organizer, and the organizer's decisions on results, groups and disputes are final.
          </p>
          <p>The one-day tournament is separate from the weekly Motionsserien series and does not affect its standings.</p>
        </Section>

        <Section title="5. Privacy, photos & data">
          <p>
            Team names and player names of approved teams are shown publicly on the one-day page. Email addresses and
            phone numbers are never published and are used only by the organizer to run the event.
          </p>
          <p>
            Photos and videos may be taken during the event and published on this website. If you want a picture
            removed, write through the {contact}. You may also ask to see, correct or delete your personal data there.
          </p>
        </Section>

        <Section title="6. Health, safety & liability">
          <p>
            You take part <strong>at your own risk</strong> and are responsible for your own health, insurance,
            equipment and belongings. Follow the rules of the Rackethall at all times.
          </p>
          <p>
            The organizer, Hitachi IF and Ludvika Badmintonklubb are not liable for injuries, lost property or
            technical errors on the website. These terms may be updated; the date above shows the current version.
            Swedish law applies.
          </p>
        </Section>
      </div>
    </>
  );
}
