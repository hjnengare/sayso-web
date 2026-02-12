import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Sayso - Hyper-local reviews & discovery for Cape Town';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const baseUrl = 'https://sayso.co.za';
  const logoUrl = `${baseUrl}/logos/logo.png`;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #722F37 0%, #5a252c 50%, #3d1a1e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              width: 148,
              height: 148,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={logoUrl}
              alt="sayso logo"
              width={120}
              height={120}
              style={{
                objectFit: 'contain',
              }}
            />
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-2px',
            }}
          >
            Sayso
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 600,
              color: '#f8f4f4',
              opacity: 0.95,
            }}
          >
            Less guessing,and more confessing.
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: '#e5e0e5',
              opacity: 0.9,
            }}
          >
            Hyper-local reviews and discovery for Cape Town
          </div>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '16px',
            }}
          >
            <div
              style={{
                padding: '8px 20px',
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              Reviews
            </div>
            <div
              style={{
                padding: '8px 20px',
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              Cape Town
            </div>
            <div
              style={{
                padding: '8px 20px',
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              Events
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
