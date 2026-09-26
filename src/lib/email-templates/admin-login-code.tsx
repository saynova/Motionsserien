import React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  code?: string;
  minutes?: number;
}

const Email = ({ code = "000000", minutes = 10 }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Admin sign-in code: ${code}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Admin sign-in code</Heading>
        <Text style={text}>
          Someone is signing in to the Motionsserien admin console from a new browser.
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={text}>
          This code expires in {minutes} minutes and can be used once.
        </Text>
        <Hr style={hr} />
        <Text style={warn}>
          If this was not you, do not share this code and change the admin password.
        </Text>
        <Text style={foot}>Motionsserien · Ludvika Badmintonklubb</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Admin sign-in code: ${d['code'] ?? ""}`,
  displayName: "Admin sign-in code",
  previewData: { code: "418 205", minutes: 10 },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "520px" };
const h1 = { color: "#0F172A", fontSize: "22px", margin: "0 0 16px" };
const text = { color: "#475569", fontSize: "14px", lineHeight: "22px", margin: "0 0 12px" };
const codeBox = {
  backgroundColor: "#F1F5F9",
  borderRadius: "10px",
  padding: "18px",
  textAlign: "center" as const,
  margin: "8px 0 16px",
};
const codeText = {
  color: "#0F172A",
  fontSize: "32px",
  fontWeight: 700,
  letterSpacing: "0.25em",
  margin: 0,
};
const hr = { borderColor: "#E2E8F0", margin: "18px 0" };
const warn = { color: "#B91C1C", fontSize: "13px", margin: "0 0 10px" };
const foot = { color: "#94A3B8", fontSize: "12px", marginTop: "14px" };
