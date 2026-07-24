'use client';
export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0A', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚡</div>
      <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#F6B800', marginBottom: '12px', letterSpacing: '0.05em' }}>
        YOU&apos;RE OFFLINE
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', maxWidth: '400px', lineHeight: 1.6, marginBottom: '32px' }}>
        BidGenius needs a connection to generate AI proposals. Check your internet and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#F6B800', color: '#000', border: 'none',
          padding: '14px 32px', fontSize: '14px', fontWeight: 900,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer'
        }}
      >
        RETRY CONNECTION →
      </button>
    </div>
  );
}
