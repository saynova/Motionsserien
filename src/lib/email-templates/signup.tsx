import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import { main, container, h1, text, link, footer, darkModeCss } from './auth-styles'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  code: string
}

const codeBox: React.CSSProperties = {
  margin: '24px 0',
  padding: '18px 12px',
  borderRadius: '10px',
  border: '1px solid #d4d4d8',
  backgroundColor: '#f4f4f5',
  textAlign: 'center' as const,
}

const codeText: React.CSSProperties = {
  margin: 0,
  fontSize: '34px',
  fontWeight: 700,
  letterSpacing: '10px',
  fontFamily: 'monospace',
  color: '#18181b',
}

export const SignupEmail = ({ siteName, siteUrl, recipient, code }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Your {siteName} verification code: {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your verification code</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Enter this code on the {siteName} website to confirm{' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>{' '}
          and finish creating your account. There is no link to click.
        </Text>
        <Section style={codeBox}>
          <Text className="dm-code" style={codeText}>
            {code}
          </Text>
        </Section>
        <Text style={text}>The code expires in one hour.</Text>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
