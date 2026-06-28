import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'KnowMyHealth — India\'s Healthcare Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: 16 }}>
          KnowMyHealth
        </div>
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)', fontWeight: 500, textAlign: 'center', maxWidth: 700 }}>
          Book Lab Tests, Consult Doctors & Get Health Packages Online
        </div>
        <div style={{ marginTop: 32, fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>
          knowmyhealth.in
        </div>
      </div>
    ),
    { ...size }
  )
}
