import React from "react";
import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  englishReply?: string;
  swedishReply?: string;
  originalBody?: string;
  closingEn?: string;
  closingSv?: string;
  signature?: string;
}

const paragraphs = (value: string) =>
  value.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0);

const signatureLines = (value: string) =>
  value.split(/\n/).map((line) => line.trim()).filter((line) => line.length > 0);

const Email = ({
  name,
  englishReply = "",
  swedishReply = "",
  originalBody = "",
  closingEn = "If you have any further questions, please feel free to contact me through the website’s contact form.",
  closingSv = "Om du har några ytterligare frågor är du välkommen att kontakta mig via kontaktformuläret på webbplatsen.",
  signature = "Best Regards\nThe General\nMd Rabiul Islam",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reply from Motionsserien HT-26</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={label}>English</Text>
        <Text style={text}>{name ? `Hi ${name},` : "Hi,"}</Text>
        {paragraphs(englishReply).map((paragraph, index) => (
          <Text key={index} style={text}>
            {paragraph}
          </Text>
        ))}
        <Text style={text}>
          If you have any further questions, please feel free to contact me through the website’s
          contact form.
        </Text>
        <Hr style={hr} />
        <Text style={label}>Svenska</Text>
        <Text style={text}>{name ? `Hej ${name},` : "Hej,"}</Text>
        {paragraphs(swedishReply).map((paragraph, index) => (
          <Text key={index} style={text}>
            {paragraph}
          </Text>
        ))}
        <Text style={text}>
          Om du har några ytterligare frågor är du välkommen att kontakta mig via kontaktformuläret
          på webbplatsen.
        </Text>
        <Text style={signature}>
          Best Regards
          <br />
          The General
          <br />
          Md Rabiul Islam
        </Text>

        {originalBody ? (
          <Section>
            <Hr style={hr} />
            <Text style={label}>Your original message · Ditt ursprungliga meddelande</Text>
            <Text style={quote}>{originalBody}</Text>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={muted}>Motionsserien HT-26 · Ludvika Badmintonklubb</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Reply from Motionsserien HT-26",
  displayName: "Reply to a message",
  previewData: {
    name: "Anna",
    englishReply: "Thanks for letting me know — the score is corrected now.",
    swedishReply: "Tack för att du meddelade mig – resultatet är nu korrigerat.",
    originalBody: "The score for our Division 3 match looks wrong.",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "600px" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#1d2a21", margin: "0 0 12px" };
const signature = { ...text, marginTop: "20px" };
const quote = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#5c6b61",
  borderLeft: "3px solid #d8e0da",
  paddingLeft: "12px",
  margin: "0 0 8px",
  whiteSpace: "pre-wrap" as const,
};
const label = {
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  color: "#7a8b7f",
  margin: "0 0 6px",
};
const muted = { fontSize: "13px", lineHeight: "20px", color: "#6b7a70", margin: "0 0 8px" };
const hr = { borderColor: "#e3e8e4", margin: "20px 0" };
