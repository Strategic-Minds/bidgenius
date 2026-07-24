'use client';
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    if (ios) {
      // Show iOS instructions after 3s
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Chrome/Edge install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!show || isInstalled) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 40px)', maxWidth: '420px',
      background: '#1C1C1C', border: '1px solid #F6B800',
      borderRadius: '8px', padding: '16px 20px', zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-start', gap: '16px',
      fontFamily: 'system-ui, sans-serif',
      animation: 'slideUp 0.3s ease'
    }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      
      {/* Icon */}
      <div style={{
        width: '48px', height: '48px', background: '#F6B800', borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: '24px'
      }}>⚡</div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
          Install BidGenius
        </div>
        {isIOS ? (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: 1.5, margin: '0 0 12px' }}>
            Tap <strong style={{color:'#F6B800'}}>Share</strong> then <strong style={{color:'#F6B800'}}>&quot;Add to Home Screen&quot;</strong> to install.
          </p>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: 1.5, margin: '0 0 12px' }}>
            Add to your home screen for instant access — works offline.
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isIOS && (
            <button onClick={handleInstall} style={{
              background: '#F6B800', color: '#000', border: 'none',
              padding: '8px 16px', fontSize: '12px', fontWeight: 800,
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px'
            }}>
              INSTALL NOW
            </button>
          )}
          <button onClick={handleDismiss} style={{
            background: 'transparent', color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.15)', padding: '8px 16px',
            fontSize: '12px', cursor: 'pointer', borderRadius: '4px'
          }}>
            Not now
          </button>
        </div>
      </div>

      {/* Close */}
      <button onClick={handleDismiss} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
        cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0, flexShrink: 0
      }}>×</button>
    </div>
  );
}
