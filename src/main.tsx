import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getMarineTrafficUrlFromSearchParams } from './services/marineTraffic'

const openShipPath = window.location.pathname.replace(/\/$/, '') === '/open-ship.html'
  || window.location.pathname.replace(/\/$/, '') === '/open-ship';

if (openShipPath) {
  const dest = getMarineTrafficUrlFromSearchParams(new URLSearchParams(window.location.search));
  window.location.replace(dest || '/');
} else {
  console.log('Mounting React application...');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
