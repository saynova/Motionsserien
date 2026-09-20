import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  weekNo?: number;
  division?: number;
  court?: number;
  startTime?: string;
  teamName?: string;
  opponentName?: string;
  submitUrl?: string;
}

const Email = ({
  weekNo = 1,
  division = 1,
  court = 1,
  startTime = "19:00",
  teamName = "Your team",
  opponentName = "your opponent",
  submitUrl = "https://www.motionsserien.se/submit",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Missing result: week {String(weekNo)}, Division {String(division)} — {teamName} v{" "}
      {opponentName}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Motionsserien HT-26</Heading>

        <Section>
          <Text style={label}>English</Text>
          <Text style={text}>Hi {teamName},</Text>
          <Text style={text}>
            We are still missing the result of your match in week {String(weekNo)}, Division{" "}
            {String(division)} — {teamName} v {opponentName}, court {String(court)} at {startTime}.
          </Text>
          <Text style={text}>
            Please submit the set scores here:{" "}
            <Link href={submitUrl} style={link}>
              {submitUrl}
            </Link>
          </Text>
          <Text style={muted}>
            You have 2 days to submit the score. A missing result is treated as a no-show and
            recorded as 0–0.
          </Text>
          <Text style={text}>
            If you have any further questions, please feel free to contact me through the website’s
            contact form.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section>
          <Text style={label}>Svenska</Text>
          <Text style={text}>Hej {teamName},</Text>
          <Text style={text}>
            Vi saknar fortfarande resultatet från er match i vecka {String(weekNo)}, Division{" "}
            {String(division)} — {teamName} mot {opponentName}, bana {String(court)} kl {startTime}.
          </Text>
          <Text style={text}>
            Rapportera setresultaten här:{" "}
            <Link href={submitUrl} style={link}>
              {submitUrl}
            </Link>
          </Text>
          <Text style={muted}>
            Ni har 2 dagar på er att rapportera resultatet. Saknat resultat räknas som walkover och
            registreras som 0–0.
          </Text>
          <Text style={text}>
            Om du har några ytterligare frågor är du välkommen att kontakta mig via
            kontaktformuläret på webbplatsen.
          </Text>
        </Section>

        <Text style={signature}>
          Best Regards
          <br />
          The General
          <br />
          Md Rabiul Islam
        </Text>
        <Hr style={hr} />
        <Text style={muted}>Motionsserien HT-26 · Ludvika Badmintonklubb</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Missing score / Saknat resultat — week ${data["weekNo"] ?? ""} Division ${data["division"] ?? ""}`,
  displayName: "Missing score reminder",
  previewData: {
    weekNo: 3,
    division: 2,
    court: 2,
    startTime: "19:20",
    teamName: "May Day",
    opponentName: "JAK & DM Smashers",
    submitUrl: "https://www.motionsserien.se/submit",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "600px" };
const h1 = { fontSize: "22px", color: "#14361f", margin: "0 0 16px" };
const label = {
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  color: "#7a8b7f",
  margin: "0 0 6px",
};
const text = { fontSize: "15px", lineHeight: "24px", color: "#1d2a21", margin: "0 0 12px" };
const signature = { ...text, marginTop: "20px" };
const muted = { fontSize: "13px", lineHeight: "20px", color: "#6b7a70", margin: "0 0 8px" };
const link = { color: "#1f7a3f" };
const hr = { borderColor: "#e3e8e4", margin: "20px 0" };
