import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Chatbot from '@/components/Chatbot'
import PatientProfileManager from '@/components/PatientProfileManager'
import { AuthProvider } from '@/lib/AuthContext'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://knowmyhealth.in'

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'KnowMyHealth — Book Lab Tests, Consult Doctors & Health Packages Online',
    template: '%s | KnowMyHealth',
  },
  description:
    'KnowMyHealth is India\'s trusted healthcare platform. Book 700+ lab tests from NABL-accredited labs, consult verified doctors online or in-clinic, and choose from comprehensive health packages — all in one place.',

  keywords: [
    'KnowMyHealth',
    'Know My Health',
    'knowmyhealth.in',
    'online doctor consultation',
    'book lab tests online',
    'health packages India',
    'NABL accredited labs',
    'video consultation doctor',
    'health checkup packages',
    'diagnostic test booking',
    'online healthcare platform India',
  ],

  authors: [{ name: 'KnowMyHealth', url: BASE_URL }],
  creator: 'KnowMyHealth',
  publisher: 'KnowMyHealth',

  alternates: {
    canonical: BASE_URL,
  },

  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: BASE_URL,
    siteName: 'KnowMyHealth',
    title: 'KnowMyHealth — Book Lab Tests, Consult Doctors & Health Packages Online',
    description:
      'India\'s trusted healthcare platform. Book 700+ lab tests, consult verified doctors, and get comprehensive health packages — fast, affordable, and NABL-accredited.',
    images: [
      {
        url: `${BASE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'KnowMyHealth — India\'s Healthcare Platform',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@knowmyhealth',
    creator: '@knowmyhealth',
    title: 'KnowMyHealth — Book Lab Tests, Consult Doctors & Health Packages Online',
    description:
      'India\'s trusted healthcare platform. Book 700+ lab tests, consult verified doctors, and get comprehensive health packages — fast, affordable, and NABL-accredited.',
    images: [`${BASE_URL}/opengraph-image`],
  },

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },

  manifest: '/manifest.json',

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
}

// JSON-LD structured data
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalOrganization',
  name: 'KnowMyHealth',
  alternateName: ['Know My Health', 'knowmyhealth.in'],
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    'KnowMyHealth is India\'s trusted online healthcare platform offering lab test booking, doctor consultations, and health packages.',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'IN',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['English', 'Hindi'],
  },
  sameAs: [
    'https://twitter.com/knowmyhealth',
    'https://www.linkedin.com/company/knowmyhealth',
    'https://www.instagram.com/knowmyhealth',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Healthcare Services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Lab Test Booking' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Doctor Consultation' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Health Packages' } },
    ],
  },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'KnowMyHealth',
  alternateName: 'Know My Health',
  url: BASE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/diagnostics?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} font-sans`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body
        className="antialiased min-h-screen flex flex-col bg-emerald-50/50 text-emerald-950 relative overflow-x-hidden"
        suppressHydrationWarning
      >
        <AuthProvider>
          <Navbar />
          <PatientProfileManager />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
          <Chatbot />
        </AuthProvider>
      </body>
    </html>
  )
}
