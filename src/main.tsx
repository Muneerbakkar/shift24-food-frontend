import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { resetMixedSessionState } from './services/authSession';

// Remove legacy mixed sessions (e.g. an old admin login that also wrote the
// customer keys) before any component reads the auth state.
resetMixedSessionState();

// Register Service Worker for PWA & Mobile Push Notifications (Android & iOS)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[Shift24 PWA] Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.warn('[Shift24 PWA] Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
