import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  teamName?: string;
  seasonName?: string;
  paymentDetails?: string;
  closingEn?: string;
  closingSv?: string;
  signature?: string;
}

const signatureLines = (value: string) =>
  value.split(/\n/).map((line) => line.trim()).filter((line) => line.length > 0);

const Email = ({
  teamName = "Your team",
  seasonName = "Motionsserien HT-26",
  paymentDetails = "Please swish the team fee to 1234785069, Ludvika Badmintonklubb. Reference: your team name.",
  closingEn = "If you have any further questions, please feel free to contact me through the website’s contact form.",
  closingSv = "Om du har några ytterligare frågor är du välkommen att kontakta mig via kontaktformuläret på webbplatsen.",
  signature = "Best Regards\nThe General\nMd Rabiul Islam",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Payment reminder / Betalningspåminnelse — {teamName} ({seasonName})
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{seasonName}</Heading>

        <Section>
          <Text style={label}>English</Text>
          <Text style={text}>Hi,</Text>
          <Text style={text}>
            We have not yet registered the team fee for <strong>{teamName}</strong> in {seasonName}.
            Please complete the payment as soon as possible so your team keeps its place in the
            ladder.
          </Text>
          <Text style={details}>{paymentDetails}</Text>
          <Text style={text}>{closingEn}</Text>
        </Section>

        <Hr style={hr} />

        <Section>
          <Text style={label}>Svenska</Text>
          <Text style={text}>Hej,</Text>
          <Text style={text}>
            Vi har ännu inte registrerat lagavgiften för <strong>{teamName}</strong> i {seasonName}.
            Betala så snart som möjligt så att ert lag behåller sin plats i serien.
          </Text>
          <Text style={details}>{paymentDetails}</Text>
          <Text style={text}>{closingSv}</Text>
        </Section>

        <Text style={signatureStyle}>
          {signatureLines(signature).map((line, index) => (
            <span key={index}>
              {index > 0 ? <br /> : null}
              {line}
            </span>
          ))}
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
    `Team fee reminder / Påminnelse om lagavgift — ${data["teamName"] ?? ""}`,
  displayName: "Payment reminder",
  previewData: {
    teamName: "May Day",
    seasonName: "Motionsserien HT-26",
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
const details = {
  ...text,
  backgroundColor: "#f4f7f5",
  padding: "12px 14px",
  borderRadius: "8px",
  whiteSpace: "pre-line" as const,
};
const signatureStyle = { ...text, marginTop: "20px" };
const muted = { fontSize: "13px", lineHeight: "20px", color: "#6b7a70", margin: "0 0 8px" };
const hr = { borderColor: "#e3e8e4", margin: "20px 0" };
