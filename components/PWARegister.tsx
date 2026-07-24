'use client';
import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[BidGenius SW] Registered:', reg.scope);
          
          // Check for updates every 60s
          setInterval(() => reg.update(), 60_000);
          
          // Notify user of SW update
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available — could show a toast here
                console.log('[BidGenius SW] New version available');
              }
            });
          });
        })
        .catch((err) => console.warn('[BidGenius SW] Registration failed:', err));
    });
  }, []);

  return null;
}
