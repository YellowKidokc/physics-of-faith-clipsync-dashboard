import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { PanelWrapper } from './PanelWrapper.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {/* Full dashboard with sidebar */}
        <Route path="/" element={<App />} />
        {/* Standalone panels — no sidebar, just the view. Open in own window. */}
        <Route path="/panel/:viewId" element={<PanelWrapper />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
