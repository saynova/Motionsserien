import React from "react";
import {
  Body,
  Button,
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
  seasonName?: string;
  weekNo?: number;
  createdAt?: string;
  finals?: number;
  waiting?: number;
  nextWeekMatches?: number;
  downloadUrl?: string;
  scheduleUrl?: string;
  scheduleWeekNo?: number;
  signature?: string;
  footer?: string;
}

const lines = (value: string) =>
  value
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const Email = ({
  seasonName = "Motionsserien HT-26",
  weekNo = 1,
  createdAt = "",
  finals = 0,
  waiting = 0,
  nextWeekMatches = 0,
  downloadUrl = "https://www.motionsserien.se",
  scheduleUrl,
  scheduleWeekNo,
  signature = "Best Regards\nThe General\nMd Rabiul Islam",
  footer = "Motionsserien HT-26 · Ludvika Badmintonklubb",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Backup ready: {seasonName} week {String(weekNo)} scores, standings and schedule
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{seasonName}</Heading>
        <Text style={text}>
          Your backup for week {String(weekNo)} is ready. It contains the standings for every
          division, all match results with set scores, and the court and time schedule for the next
          week.
        </Text>

        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={downloadUrl} style={button}>
            Download PDF backup
          </Button>
        </Section>

        <Section style={box}>
          <Text style={item}>Created: {createdAt}</Text>
          <Text style={item}>Finished matches this week: {String(finals)}</Text>
          <Text style={item}>Still waiting for a result: {String(waiting)}</Text>
          <Text style={item}>Matches planned for next week: {String(nextWeekMatches)}</Text>
        </Section>

        <Text style={muted}>
          Save the file on your phone or laptop. If the website is ever unreachable on a Monday, you
          can run the evening straight from this PDF.
        </Text>

        <Hr style={hr} />
        <Section>
          {lines(signature).map((line, index) => (
            <Text key={index} style={index === 0 ? text : signatureLine}>
              {line}
            </Text>
          ))}
        </Section>
        <Text style={footerStyle}>{footer}</Text>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: "#f5f6f8", fontFamily: "Helvetica, Arial, sans-serif" };
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "600px",
  borderRadius: "8px",
};
const h1 = { fontSize: "22px", fontWeight: 700 as const, color: "#14161a", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#22252b", margin: "0 0 12px" };
const signatureLine = { fontSize: "15px", lineHeight: "22px", color: "#22252b", margin: "0" };
const muted = { fontSize: "13px", lineHeight: "20px", color: "#5c6069", margin: "12px 0 0" };
const item = { fontSize: "14px", lineHeight: "22px", color: "#22252b", margin: "0" };
const box = {
  backgroundColor: "#f5f6f8",
  borderRadius: "6px",
  padding: "14px 16px",
  margin: "0 0 12px",
};
const button = {
  backgroundColor: "#14161a",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 700 as const,
  padding: "13px 26px",
  borderRadius: "6px",
  textDecoration: "none",
};
const hr = { borderColor: "#e3e5e9", margin: "24px 0 16px" };
const footerStyle = { fontSize: "12px", color: "#83878f", margin: "16px 0 0" };

export const template: TemplateEntry = {
  component: Email,
  subject: (data) =>
    `Backup: ${data['seasonName'] ?? "Motionsserien"} week ${data['weekNo'] ?? ""} scores and schedule`,
  displayName: "Weekly score & schedule backup",
  previewData: {
    seasonName: "Motionsserien HT-26",
    weekNo: 3,
    createdAt: "2026-09-29 22:30",
    finals: 28,
    waiting: 2,
    nextWeekMatches: 30,
    downloadUrl: "https://www.motionsserien.se",
  },
};

export default Email;
