import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  teamName?: string
  buyerName?: string
  quantity?: number
  price?: number
}

const Email = ({ teamName, buyerName, quantity, price }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your shuttle order is confirmed — show this email when collecting</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Shuttle order confirmation</Heading>
        <Text style={text}>{buyerName ? `Hi ${buyerName},` : 'Hi there,'}</Text>
        <Text style={text}>
          Thank you — your shuttle order has been received and your Swish payment is registered.
        </Text>
        <Section style={summary}>
          <Text style={row}><strong>Team:</strong> {teamName ?? '—'}</Text>
          <Text style={row}><strong>Buyer:</strong> {buyerName ?? '—'}</Text>
          <Text style={row}><strong>Boxes:</strong> {quantity ?? 1}</Text>
          {price ? <Text style={row}><strong>Price:</strong> {price} kr per box</Text> : null}
        </Section>
        <Section style={highlight}>
          <Text style={highlightText}>
            Please show this confirmation to the General when collecting your shuttle box.
          </Text>
        </Section>
        <Text style={text}>
          Shuttles are delivered each Monday at 20:00 in the Rackethall.
        </Text>
        <Text style={footer}>Motionsserien — Ludvika Badmintonklubb</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Shuttle order confirmed — show this when collecting',
  displayName: 'Shuttle order confirmation',
  previewData: { teamName: 'Smash Bros', buyerName: 'Jane Doe', quantity: 1, price: 135 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { fontSize: '22px', color: '#0f172a' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6' }
const summary = { backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '12px 16px', margin: '12px 0' }
const row = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const highlight = { backgroundColor: '#eef2ff', borderLeft: '4px solid #4f46e5', borderRadius: '6px', padding: '12px 16px', margin: '16px 0' }
const highlightText = { fontSize: '15px', fontWeight: 'bold' as const, color: '#312e81', margin: '0' }
const footer = { fontSize: '12px', color: '#94a3b8', marginTop: '24px' }
