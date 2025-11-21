import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { BACKEND_URL, GOOGLE_CLIENT_ID as FRONTEND_GOOGLE_CLIENT_ID } from './config'
import { AppConfigContext, AppConfig } from './context/AppConfigContext'

function AppBootstrap() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function loadConfig() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/config`)
        const data = await res.json()
        if (!isMounted) return
        setConfig({
          googleClientId: data?.googleClientId || FRONTEND_GOOGLE_CLIENT_ID || null
        })
      } catch (error) {
        console.error('Failed to load auth config', error)
        if (!isMounted) return
        setConfig({
          googleClientId: FRONTEND_GOOGLE_CLIENT_ID || null
        })
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadConfig()
    return () => {
      isMounted = false
    }
  }, [])

  if (loading || !config) {
    return null
  }

  const appTree = (
    <AppConfigContext.Provider value={config}>
      <App />
    </AppConfigContext.Provider>
  )

  if (config.googleClientId) {
    return (
      <GoogleOAuthProvider clientId={config.googleClientId}>
        {appTree}
      </GoogleOAuthProvider>
    )
  }

  return appTree
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>,
)
