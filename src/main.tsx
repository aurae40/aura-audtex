import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register PWA Service Worker for 100% offline application shell
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Robust subpath base resolution for both root and GitHub Pages subfolders (/aura-audtex/)
    let base = window.location.pathname;
    if (base.endsWith('.html')) {
      base = base.substring(0, base.lastIndexOf('/') + 1);
    } else if (!base.endsWith('/')) {
      base = base + '/';
    }
    const workerUrl = `${base}sw.js`;
    navigator.serviceWorker
      .register(workerUrl, { scope: base })
      .then((reg) => {
        console.log('AuRA PWA Service Worker registered at scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('AuRA PWA Service Worker registration skipped:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
