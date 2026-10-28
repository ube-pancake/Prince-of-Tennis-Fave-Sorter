import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const root = createRoot(document.getElementById('root'))

// The local tools (/?crop and /?import) only exist under `npm run dev`; production builds drop these branches.
const params = new URLSearchParams(window.location.search)
if (import.meta.env.DEV && params.has('crop')) {
  import('./CropTool.jsx').then(({ default: CropTool }) => root.render(<React.StrictMode><CropTool /></React.StrictMode>))
} else if (import.meta.env.DEV && params.has('import')) {
  import('./ImportTool.jsx').then(({ default: ImportTool }) => root.render(<React.StrictMode><ImportTool /></React.StrictMode>))
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
