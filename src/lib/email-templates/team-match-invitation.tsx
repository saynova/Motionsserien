import React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  playerName?: string;
  partnerName?: string;
  teamName?: string;
  tournamentName?: string;
  confirmationUrl?: string;
  signature?: string;
  footer?: string;
}

function Email({ playerName = "Player", partnerName = "your partner", teamName = "Your team", tournamentName = "Motionsserien", confirmationUrl, signature = "The General\nMd Rabiul Islam", footer = "Motionsserien · Ludvika Badmintonklubb" }: Props) {
  return <Html lang="en"><Head /><Preview>Confirm your team formation — {teamName}</Preview><Body style={main}><Container style={container}>
    <Heading style={heading}>{tournamentName}</Heading>
    <Text style={label}>English</Text>
    <Text style={text}>Hi {playerName},</Text>
    <Text style={text}>Good news! The admin has matched you with {partnerName} to form the team <strong>{teamName}</strong>.</Text>
    <Text style={text}>Please confirm that you agree to play together. Both players must confirm before the team formation is confirmed. Tournament registration remains subject to the admin’s approval.</Text>
    {confirmationUrl ? <Button href={confirmationUrl} style={button}>Review and confirm my team</Button> : null}
    <Text style={text}>Once the team is confirmed, please complete the payment if you have not already paid. Payment information is available on the <Link href="https://www.motionsserien.se/register" style={link}>website registration page</Link>.</Text>
    <Text style={text}>Your invitation is valid for 14 days. If you cannot join this team, please <Link href="https://www.motionsserien.se/ask" style={link}>contact the General</Link>.</Text>
    <Text style={notice}>Please check your junk/spam folder to make sure you receive any further emails from motionsserien.se</Text>
    <Hr style={hr} />
    <Text style={label}>Svenska</Text>
    <Text style={text}>Hej {playerName},</Text>
    <Text style={text}>Goda nyheter! Administratören har parat ihop dig med {partnerName} för att bilda laget <strong>{teamName}</strong>.</Text>
    <Text style={text}>Bekräfta att du vill spela tillsammans med din partner. Båda spelarna måste bekräfta innan lagbildningen är bekräftad. Anmälan till turneringen behöver fortfarande godkännas av administratören.</Text>
    {confirmationUrl ? <Button href={confirmationUrl} style={button}>Granska och bekräfta mitt lag</Button> : null}
    <Text style={text}>När laget är bekräftat, slutför betalningen om du inte redan har betalat. Betalningsinformation finns på <Link href="https://www.motionsserien.se/register" style={link}>webbplatsens anmälningssida</Link>.</Text>
    <Text style={text}>Inbjudan gäller i 14 dagar. Om du inte kan spela i detta lag, <Link href="https://www.motionsserien.se/ask" style={link}>kontakta Generalen</Link>.</Text>
    <Text style={notice}>Kontrollera din skräppostmapp så att du inte missar kommande mejl från motionsserien.se.</Text>
    <Hr style={hr} />
    {signature.split("\n").map((line, i) => <Text key={i} style={text}>{line}</Text>)}<Text style={text}>{footer}</Text>
  </Container></Body></Html>;
}

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) => `Confirm your team / Bekräfta ditt lag — ${data["teamName"] ?? "Motionsserien"}`,
  displayName: "Matched team confirmation invitation",
  previewData: { playerName: "Alex", partnerName: "Sam", teamName: "Smash Team", tournamentName: "Motionsserien" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { padding: "28px", maxWidth: "560px" };
const heading = { color: "#0F172A", fontSize: "24px" };
const text = { color: "#475569", fontSize: "14px", lineHeight: "22px" };
const label = { color: "#4F46E5", fontWeight: 700, fontSize: "12px" };
const button = { backgroundColor: "#4F46E5", color: "#ffffff", padding: "12px 18px", borderRadius: "6px", fontSize: "14px", fontWeight: 700 };
const link = { color: "#4F46E5" };
const notice = { ...text, fontWeight: 700 };
const hr = { borderColor: "#E2E8F0", margin: "22px 0" };