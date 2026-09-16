import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  replyBody?: string
  originalBody?: string
}

const Email = ({ name, replyBody = '', originalBody = '' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reply from Motionsserien HT-26</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Motionsserien HT-26</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        {replyBody
          .split(/\n{2,}/)
          .filter((p) => p.trim().length > 0)
          .map((paragraph, index) => (
            <Text key={index} style={text}>
              {paragraph}
            </Text>
          ))}
        <Text style={text}>
          / Md Rabiul Islam — The General
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
)

export const template = {
  component: Email,
  subject: 'Reply from Motionsserien HT-26',
  displayName: 'Reply to a message',
  previewData: {
    name: 'Anna',
    replyBody: 'Thanks for letting me know — the score is corrected now.\n\nTack för att du hörde av dig!',
    originalBody: 'The score for our Division 3 match looks wrong.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#14361f', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1d2a21', margin: '0 0 12px' }
const quote = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#5c6b61',
  borderLeft: '3px solid #d8e0da',
  paddingLeft: '12px',
  margin: '0 0 8px',
  whiteSpace: 'pre-wrap' as const,
}
const label = {
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  color: '#7a8b7f',
  margin: '0 0 6px',
}
const muted = { fontSize: '13px', lineHeight: '20px', color: '#6b7a70', margin: '0 0 8px' }
const hr = { borderColor: '#e3e8e4', margin: '20px 0' }
