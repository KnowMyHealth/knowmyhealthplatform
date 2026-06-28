import type { Metadata } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://knowmyhealth.in'

export const metadata: Metadata = {
  title: 'Health Checkup Packages — Full Body, Cardiac, Diabetes & More',
  description:
    'Choose from comprehensive health checkup packages on KnowMyHealth. Full body checkup, cardiac screening, diabetes panel, women\'s health, cancer screening, and joint health packages available.',
  alternates: { canonical: `${BASE_URL}/checkups` },
  openGraph: {
    title: 'Health Checkup Packages — Full Body, Cardiac & More | KnowMyHealth',
    description:
      'Comprehensive health checkup packages tailored to your wellness needs. Full body, cardiac, diabetes, cancer, and women\'s health screenings on KnowMyHealth.',
    url: `${BASE_URL}/checkups`,
  },
}

const checkupsSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Health Checkup Packages | KnowMyHealth',
  url: `${BASE_URL}/checkups`,
  description:
    'Comprehensive health checkup packages including full body, cardiac, diabetes, and cancer screenings.',
  audience: { '@type': 'Patient' },
}

export default function CheckupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(checkupsSchema) }}
      />
      {children}
    </>
  )
}
