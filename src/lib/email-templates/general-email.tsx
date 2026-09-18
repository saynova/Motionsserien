import React from 'react'
import { Body, Container, Head, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  subject?: string
  bodyText?: string
}

const Email = ({ name, subject = '', bodyText = '' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject || 'Motionsserien HT-26'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        {bodyText
          .split(/\n{2,}/)
          .filter((p) => p.trim().length > 0)
          .map((paragraph, index) => (
            <Text key={index} style={text}>
              {paragraph}
            </Text>
          ))}
        <Text style={text}>/ Motionsserien HT-26</Text>
        <Hr style={hr} />
        <Text style={muted}>Motionsserien HT-26 · Ludvika Badmintonklubb</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const value = data?.['subject']
    return typeof value === 'string' && value.trim().length > 0 ? value : 'Motionsserien HT-26'
  },
  displayName: 'Email from the General',
  previewData: {
    name: 'Anna',
    subject: 'Court change on Monday',
    bodyText: 'Division 3 plays on court 4 this Monday.\n\nDivision 3 spelar på bana 4 i måndag.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1d2a21', margin: '0 0 12px' }
const muted = { fontSize: '13px', lineHeight: '20px', color: '#6b7a70', margin: '0 0 8px' }
const hr = { borderColor: '#e3e8e4', margin: '20px 0' }
