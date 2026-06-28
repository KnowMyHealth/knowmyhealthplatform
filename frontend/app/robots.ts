import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://knowmyhealth.in'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/auth/',
          '/reset-password',
          '/my-prescriptions',
          '/prescription',
          '/complaints',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
