import type { Metadata } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://knowmyhealth.in'

export const metadata: Metadata = {
  title: 'Consult Verified Doctors Online & In-Clinic',
  description:
    'Book video or in-clinic consultations with verified doctors on KnowMyHealth. Specialties include General Medicine, Cardiology, Dermatology, and more. Instant slots available.',
  alternates: { canonical: `${BASE_URL}/consultations` },
  openGraph: {
    title: 'Consult Verified Doctors Online & In-Clinic | KnowMyHealth',
    description:
      'Connect with top healthcare professionals for video or in-clinic visits. Find doctors by specialty, check availability, and book instantly on KnowMyHealth.',
    url: `${BASE_URL}/consultations`,
  },
}

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Online Doctor Consultation | KnowMyHealth',
  url: `${BASE_URL}/consultations`,
  description:
    'Book video or in-clinic consultations with verified doctors on KnowMyHealth.',
  about: { '@type': 'MedicalCondition', name: 'General Healthcare Consultation' },
  audience: { '@type': 'Patient' },
  lastReviewed: '2026-06-01',
}

export default function ConsultationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalWebPageSchema).replace(/</g, '\\u003c') }}
      />
      {children}
    </>
  )
}
