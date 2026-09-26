import React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  subject?: string;
  title?: string;
  messageEn?: string;
  messageSv?: string;
  buttonUrl?: string;
  buttonLabel?: string;
  signature?: string;
  footer?: string;
}

const lines = (v: string) => v.split(/\n/).map((l) => l.trim()).filter(Boolean);

const Email = ({
  title = "Motionsserien",
  messageEn = "",
  messageSv = "",
  buttonUrl,
  buttonLabel = "Open my account",
  signature = "Best Regards\nThe General\nMd Rabiul Islam",
  footer = "Motionsserien · Ludvika Badmintonklubb",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{title}</Heading>
        <Section>
          <Text style={label}>English</Text>
          <Text style={text}>Hi,</Text>
          {lines(messageEn).map((l, i) => (
            <Text key={i} style={text}>{l}</Text>
          ))}
        </Section>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Svenska</Text>
          <Text style={text}>Hej,</Text>
          {lines(messageSv).map((l, i) => (
            <Text key={i} style={text}>{l}</Text>
          ))}
        </Section>
        {buttonUrl ? (
          <Section style={{ margin: "20px 0" }}>
            <Button href={buttonUrl} style={button}>{buttonLabel}</Button>
          </Section>
        ) : null}
        <Hr style={hr} />
        {lines(signature).map((l, i) => (
          <Text key={i} style={sig}>{l}</Text>
        ))}
        <Text style={foot}>{footer}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => String(d.subject ?? "Motionsserien"),
  displayName: "Player notice",
  previewData: {
    subject: "Your partner has joined",
    title: "Your partner has joined",
    messageEn: "Anna Svensson has joined your team Smash Bros.",
    messageSv: "Anna Svensson har gått med i ditt lag Smash Bros.",
    buttonUrl: "https://motionsserien.se/account",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { color: "#0F172A", fontSize: "22px", margin: "0 0 16px" };
const label = { color: "#4F46E5", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 6px" };
const text = { color: "#475569", fontSize: "14px", lineHeight: "22px", margin: "0 0 10px" };
const hr = { borderColor: "#E2E8F0", margin: "18px 0" };
const button = { backgroundColor: "#4F46E5", color: "#ffffff", padding: "10px 18px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, textDecoration: "none" };
const sig = { color: "#0F172A", fontSize: "14px", margin: "0" };
const foot = { color: "#94A3B8", fontSize: "12px", marginTop: "18px" };
