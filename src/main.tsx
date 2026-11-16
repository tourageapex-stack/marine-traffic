import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppUpdatePrompt } from './components/AppUpdatePrompt.tsx'
import { startAppUpdateWatcher } from './appUpdate.ts'

console.log('Mounting React application...');
startAppUpdateWatcher();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppUpdatePrompt />
  </StrictMode>,
)
