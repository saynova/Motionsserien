import React from "react";
import { Body, Container, Head, Hr, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  subject?: string;
  englishBody?: string;
  swedishBody?: string;
}

const paragraphs = (value: string) =>
  value.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0);

const Email = ({ name, subject = "", englishBody = "", swedishBody = "" }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject || "Motionsserien HT-26"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={label}>English</Text>
        <Text style={text}>{name ? `Hi ${name},` : "Hi,"}</Text>
        {paragraphs(englishBody).map((paragraph, index) => (
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
        {paragraphs(swedishBody).map((paragraph, index) => (
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
        <Hr style={hr} />
        <Text style={muted}>Motionsserien HT-26 · Ludvika Badmintonklubb</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const value = data?.["subject"];
    return typeof value === "string" && value.trim().length > 0 ? value : "Motionsserien HT-26";
  },
  displayName: "Email from the General",
  previewData: {
    name: "Anna",
    subject: "Court change on Monday",
    englishBody: "Division 3 plays on court 4 this Monday.",
    swedishBody: "Division 3 spelar på bana 4 denna måndag.",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "600px" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#1d2a21", margin: "0 0 12px" };
const signature = { ...text, marginTop: "20px" };
const label = {
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  color: "#7a8b7f",
  margin: "0 0 6px",
};
const muted = { fontSize: "13px", lineHeight: "20px", color: "#6b7a70", margin: "0 0 8px" };
const hr = { borderColor: "#e3e8e4", margin: "20px 0" };
