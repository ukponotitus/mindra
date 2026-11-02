import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/notifications'
import { reloadOnce } from './lib/reload'

// A tab open across a deploy asks for page code that's gone: load the new version instead (once a minute at most).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnce()) event.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Shows post reminders on this device; it caches nothing.
registerServiceWorker()
