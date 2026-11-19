import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { startRuntime } from './app/runtime.ts'
import { phaseEnded } from './services/alerts.ts'
import './index.css'
import { useTimerStore } from './store/timerStore.ts'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

// A phase that ended while the page was closed is settled first, as an away end;
// the runtime then sets data-phase before the first render.
useTimerStore.getState().restoreOnLoad()
startRuntime({ onPhaseEnd: phaseEnded })

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
