import type { Metadata } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://knowmyhealth.in'

export const metadata: Metadata = {
  title: 'Book Lab Tests Online from NABL-Accredited Labs',
  description:
    'Search and book from 700+ diagnostic tests on KnowMyHealth. Compare prices across NABL-accredited labs, book home collection, and get reports fast. Blood tests, MRI, X-ray, and more.',
  alternates: { canonical: `${BASE_URL}/diagnostics` },
  openGraph: {
    title: 'Book Lab Tests Online from NABL-Accredited Labs | KnowMyHealth',
    description:
      'Search 700+ lab tests, compare prices from NABL-accredited labs, and book home sample collection in seconds on KnowMyHealth.',
    url: `${BASE_URL}/diagnostics`,
  },
}

const diagnosticsSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Book Lab Tests Online | KnowMyHealth',
  url: `${BASE_URL}/diagnostics`,
  description:
    'Book diagnostic lab tests from NABL-accredited labs with price comparison and home collection.',
  about: { '@type': 'MedicalTest', name: 'Diagnostic Lab Tests' },
  audience: { '@type': 'Patient' },
  lastReviewed: '2026-06-01',
}

export default function DiagnosticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(diagnosticsSchema).replace(/</g, '\\u003c') }}
      />
      {children}
    </>
  )
}
