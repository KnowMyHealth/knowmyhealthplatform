import type { Metadata } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://knowmyhealth.in'

export const metadata: Metadata = {
  title: 'Medical Insights & Health Articles',
  description:
    'Expert medical insights, health tips, and wellness guides curated by top healthcare professionals on KnowMyHealth. Stay informed about your health.',
  alternates: { canonical: `${BASE_URL}/insights` },
  openGraph: {
    title: 'Medical Insights & Health Articles | KnowMyHealth',
    description:
      'Expert perspectives, medical breakthroughs, and wellness guides curated by top healthcare professionals on KnowMyHealth.',
    url: `${BASE_URL}/insights`,
  },
}

const insightsSchema = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'KnowMyHealth Medical Insights',
  url: `${BASE_URL}/insights`,
  description: 'Expert medical insights and wellness guides from top healthcare professionals.',
  publisher: {
    '@type': 'Organization',
    name: 'KnowMyHealth',
    url: BASE_URL,
  },
}

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(insightsSchema) }}
      />
      {children}
    </>
  )
}
