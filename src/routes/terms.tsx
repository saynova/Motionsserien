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
      {
        name: "keywords",
        content:
          "Motionsserien terms, badminton rules Ludvika, villkor Motionsserien, privacy policy badminton, scoring rules badminton",
      },
      { property: "og:title", content: "Terms & Conditions — Motionsserien HT-26" },
      {
        property: "og:description",
        content:
          "The rules and policies for using the Motionsserien HT-26 site, including scoring, shuttle orders, privacy and liability.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.motionsserien.se/terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.motionsserien.se/terms" }],
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
        Last updated: 1 October 2026
      </p>

      <div className="space-y-6">
        <Section title="1. Tournament & scoring rules">
          <p>
            Motionsserien is a friendly weekly badminton ladder organized by Hitachi IF and Ludvika
            Badmintonklubb. All players are expected to play fair and report scores honestly.
          </p>
          <p>
            From the next tournament, matches are best of 3 sets to 15 points. At 15–15 the first
            team to reach 16 wins the set. If the teams split the first two sets, a deciding third
            set is played to 9 points; at 9–9 the first team to reach 10 wins the match.
          </p>
          <p>
            Weekly division movement: 2 wins move up, 1 win stays, 0 wins move down. Ties are
            decided by head-to-head, then set difference, point difference and total points. The
            schedule is published once registration closes.
          </p>
          <p>
            The General may adjust rankings and divisions when necessary, and may amend the rules
            during the season; changes are announced on this website. The General's decisions are
            final. See the full{" "}
            <Link to="/register" hash="rules" className="font-semibold text-primary underline">
              Rules to play
            </Link>
            .
          </p>
        </Section>

        <Section title="2. Score deadline: Wednesday 10:00 — final">
          <p>
            Results must be submitted on the{" "}
            <Link to="/submit" className="font-semibold text-primary underline">
              Submit score
            </Link>{" "}
            page <strong>before Wednesday at 10:00 (Swedish time)</strong> after the Monday match.
          </p>
          <p>
            If no result is submitted before that time, the match is automatically recorded as a{" "}
            <strong>no-show, 0–0</strong>, which counts as a loss for both teams.
          </p>
          <p>
            <strong>
              After Wednesday 10:00 the week is closed and the result cannot be changed. The
              General (the organizer) cannot help, cannot accept a late score, and cannot undo a
              0–0 or a division movement — not for anyone, for any reason.
            </strong>{" "}
            The next week's divisions and schedule are generated from the closed week, so late
            changes are not possible. There is no appeal.
          </p>
          <p>
            It is each team's own responsibility to report in time. Both teams may report; one
            correct submission is enough. Before the deadline, a clear typing mistake can be
            corrected by contacting the organizer — after the deadline it cannot.
          </p>
        </Section>

        <Section title="3. What is public and what is private">
          <p>
            <strong>
              Team names and player names are public on this website.
            </strong>{" "}
            They appear in standings, schedules, results, team pages, progress history and the Hall
            of Fame, and may be seen by anyone, including search engines.
          </p>
          <p>
            <strong>
              Shuttle purchases are also public: the team name and the name of the person who
              ordered are shown in the public shuttle list,
            </strong>{" "}
            together with the number of boxes and the date. This keeps deliveries and payments
            transparent for everyone.
          </p>
          <p>
            Email addresses, phone numbers, passwords, messages and payment details are{" "}
            <strong>never published</strong>. They are visible only to the organizer and are used
            only to run the tournament.
          </p>
          <p>
            By registering a team, joining as a player, or ordering shuttles, you confirm that you
            accept this public display of team and player names. If you do not accept it, please do
            not register.
          </p>
        </Section>

        <Section title="4. Photos and videos">
          <p>
            Photos and videos are taken during match evenings in the Rackethall and published in
            the Photos and Hall of Fame sections of this website, and may also be used in
            tournament summaries, emails and club information about Motionsserien.
          </p>
          <p>
            By taking part in the tournament, or by being present in the hall during match
            evenings, you agree that pictures and video in which you appear may be published in
            this way, without payment. The organizer keeps them as part of the tournament history.
          </p>
          <p>
            Only material connected to the tournament is published. Nothing offensive, private or
            harmful is published knowingly.
          </p>
          <p>
            If you do not want a specific photo or video of yourself on the site, write to the
            organizer through the{" "}
            <Link to="/ask" className="font-semibold text-primary underline">
              Contact page
            </Link>{" "}
            and it will be removed. Photos of children are removed on request from a parent or
            guardian without any questions.
          </p>
          <p>
            Anything you upload or send to the organizer must be your own material and must not
            break anyone's rights. The organizer may remove any content at any time.
          </p>
        </Section>

        <Section title="5. Fees, cancellations & shuttle purchases">
          <p>
            If a team cancels late and does not provide a replacement team, an invoice of 800 SEK
            may be issued to the registered team.
          </p>
          <p>
            Shuttle boxes cost <strong>135 kr</strong>, paid by Swish to{" "}
            <strong>1234785069, Ludvika Badmintonklubb</strong>, with the team name as the Swish
            message. Please swish before or when you place the order.
          </p>
          <p>
            Each team may order a <strong>maximum of 1 shuttle box per two weeks</strong>. Orders
            are reviewed by an admin before they appear in the public list.
          </p>
          <p>
            Ordered shuttles are delivered <strong>every Monday at 20:00 in the Rackethall</strong>.
            An approved order is binding and is not refundable once delivered. Registration fees
            are not refundable either.
          </p>
        </Section>

        <Section title="6. Conduct, health and safety">
          <p>
            Play fair and be respectful to opponents, other players, the hall staff and the
            organizer. False results, playing with unregistered players, abusive behaviour or
            repeated no-shows may lead to corrected results, loss of a place, or removal from the
            tournament.
          </p>
          <p>
            You take part <strong>at your own risk</strong> and are responsible for being healthy
            enough to play. You are responsible for your own insurance and for your own equipment
            and belongings in the hall.
          </p>
          <p>
            Follow the rules of the Rackethall at all times, including opening hours, court use and
            safety instructions.
          </p>
        </Section>

        <Section title="7. Accounts and website use">
          <p>
            You are responsible for the information you enter and for keeping your password to
            yourself. Do not register other people without their permission.
          </p>
          <p>
            Do not try to break, overload or misuse the website, and do not submit results for
            matches you did not play.
          </p>
          <p>
            You may at any time ask to see, correct, or delete your personal data by contacting the
            organizer through the{" "}
            <Link to="/ask" className="font-semibold text-primary underline">
              Contact page
            </Link>
            . Please note that results, team names and player names that are part of the finished
            tournament history normally remain published.
          </p>
          <p>
            Visit information (IP address, device, browser and approximate location) is logged for
            security and fair-play checks, kept for a limited time, and visible only to the
            organizer.
          </p>
        </Section>

        <Section title="8. Liability & contact">
          <p>
            This site is provided as-is, without any guarantee that it is always available or free
            from errors. The organizer, Hitachi IF and Ludvika Badmintonklubb are not liable for
            injuries, illness, lost or damaged property, missed matches, technical errors, lost
            submissions, or incorrect information on the site.
          </p>
          <p>
            The organizer (The General) has the final decision in all sporting questions,
            including divisions, seeding, results and disputes, within the rules above.
          </p>
          <p>
            These terms may be updated from time to time; the current version is always published
            on this page with its date. Swedish law applies.
          </p>
          <p>
            Questions and feedback are handled through the{" "}
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
