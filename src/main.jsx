import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))

// The crop tool (/?crop) only exists under `npm run dev`; production builds drop this branch entirely.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('crop')) {
  import('./CropTool.jsx').then(({ default: CropTool }) => root.render(<React.StrictMode><CropTool /></React.StrictMode>))
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
