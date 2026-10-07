import React from "react";
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  status?: "approved" | "rejected";
  tournamentName?: string;
  teamName?: string;
  siteUrl?: string;
  signature?: string;
  footer?: string;
  oneDay?: boolean;
}

const lines = (v: string) => v.split(/\n/).map((l) => l.trim()).filter(Boolean);

const Email = ({
  status = "approved",
  tournamentName = "Motionsserien",
  teamName = "your team",
  siteUrl = "https://www.motionsserien.se",
  signature = "Best Regards\nThe General\nMd Rabiul Islam",
  footer = "Motionsserien · Ludvika Badmintonklubb",
  oneDay = false,
}: Props) => {
  const ok = status === "approved";
  const contactUrl = `${siteUrl}/ask`;
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{ok ? `Your registration for ${tournamentName} is confirmed` : `Update on your registration for ${tournamentName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{tournamentName}</Heading>
          <Section>
            <Text style={label}>English</Text>
            <Text style={text}>Hi {teamName},</Text>
            {ok ? (
              <>
                <Text style={strong}>Congratulations!</Text>
                <Text style={text}>Your registration for {tournamentName} has been successfully approved, and your spot is now confirmed.</Text>
                {oneDay ? (
                  <Text style={text}>You will get an email regarding the schedule and other information very soon.</Text>
                ) : (
                  <Text style={text}>Please visit the website for further schedule updates and important information: <Link href={siteUrl} style={link}>{siteUrl}</Link></Text>
                )}
              </>
            ) : (
              <>
                <Text style={text}>We regret to inform you that we are unable to accept your team registration.</Text>
                <Text style={text}>If you want to know about this decision, please contact the General: <Link href={contactUrl} style={link}>{contactUrl}</Link></Text>
              </>
            )}
          </Section>
          <Hr style={hr} />
          <Section>
            <Text style={label}>Svenska</Text>
            <Text style={text}>Hej {teamName},</Text>
            {ok ? (
              <>
                <Text style={strong}>Grattis!</Text>
                <Text style={text}>Er anmälan till {tournamentName} har godkänts och er plats är nu bekräftad.</Text>
                {oneDay ? (
                  <Text style={text}>Ni kommer snart att få ett mejl med spelschema och annan information.</Text>
                ) : (
                  <Text style={text}>Besök webbplatsen för kommande spelschema och viktig information: <Link href={siteUrl} style={link}>{siteUrl}</Link></Text>
                )}
              </>
            ) : (
              <>
                <Text style={text}>Vi måste tyvärr meddela att vi inte kan godkänna er laganmälan.</Text>
                <Text style={text}>Om ni vill veta mer om beslutet, kontakta Generalen: <Link href={contactUrl} style={link}>{contactUrl}</Link></Text>
              </>
            )}
          </Section>
          <Hr style={hr} />
          {lines(signature).map((l, i) => (
            <Text key={i} style={sig}>{l}</Text>
          ))}
          <Text style={foot}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d["status"] === "rejected"
      ? `Registration update / Besked om anmälan — ${d["tournamentName"] ?? "Motionsserien"}`
      : `Registration confirmed / Anmälan bekräftad — ${d["tournamentName"] ?? "Motionsserien"}`,
  displayName: "Registration approved / rejected",
  previewData: { status: "approved", tournamentName: "Motionsserien HT-26", teamName: "Smash Bros" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { color: "#0F172A", fontSize: "22px", margin: "0 0 16px" };
const label = { color: "#4F46E5", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 6px" };
const text = { color: "#475569", fontSize: "14px", lineHeight: "22px", margin: "0 0 10px" };
const strong = { ...text, color: "#0F172A", fontWeight: 700, fontSize: "16px" };
const link = { color: "#4F46E5" };
const hr = { borderColor: "#E2E8F0", margin: "18px 0" };
const sig = { color: "#0F172A", fontSize: "14px", margin: "0 0 2px" };
const foot = { color: "#94A3B8", fontSize: "12px", margin: "16px 0 0" };
