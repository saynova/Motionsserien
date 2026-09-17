// Shared brand styles for auth emails. Body stays white for deliverability.
export const colors = {
  background: '#ffffff',
  text: '#1f2937',
  muted: '#6b7280',
  heading: '#0f3d2b',
  primary: '#c4e538',
  primaryDark: '#142e1d',
  border: '#d1d5db',
  codeBg: '#f0f9e8',
}

export const main = {
  backgroundColor: colors.background,
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: colors.text,
}

export const container = { padding: '24px 28px', maxWidth: '520px' }

export const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: colors.heading,
  margin: '0 0 18px',
  lineHeight: '1.25',
}

export const text = {
  fontSize: '15px',
  color: colors.text,
  lineHeight: '1.6',
  margin: '0 0 22px',
}

export const link = { color: colors.heading, textDecoration: 'underline' }

export const button = {
  backgroundColor: colors.primary,
  color: colors.primaryDark,
  fontSize: '15px',
  fontWeight: 'bold' as const,
  border: `1px solid ${colors.primary}`,
  borderRadius: '8px',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}

export const footer = {
  fontSize: '12px',
  color: colors.muted,
  margin: '32px 0 0',
  lineHeight: '1.5',
}

export const codeBox = {
  fontFamily: 'Courier, monospace',
  fontSize: '26px',
  fontWeight: 'bold' as const,
  color: colors.heading,
  backgroundColor: colors.codeBg,
  padding: '14px 20px',
  borderRadius: '8px',
  letterSpacing: '0.08em',
  margin: '0 0 28px',
  display: 'inline-block' as const,
}

// Rendered as a text child, so keep CSS free of >, &, and quotes.
export const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #c4e538 !important; color: #142e1d !important; border-color: #c4e538 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #c4e538 !important; color: #142e1d !important; border-color: #c4e538 !important; }
  [data-ogsb] .dm-btn { background-color: #c4e538 !important; color: #142e1d !important; border-color: #c4e538 !important; }
`
