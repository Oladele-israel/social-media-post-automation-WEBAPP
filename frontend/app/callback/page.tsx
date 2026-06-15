"use client"

import { useEffect } from "react"

export default function OAuthCallbackPage() {
  useEffect(() => {
    if (window.opener) {
      // Signal the main window that OAuth completed successfully
      window.opener.postMessage({ type: "OAUTH_SUCCESS" }, window.location.origin)
      window.close()
    } else {
      // Opened directly (not as a popup) — redirect to dashboard
      window.location.replace("/dashboard")
    }
  }, [])

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "sans-serif", color: "#6b7280",
    }}>
      <p>Connecting your account…</p>
    </div>
  )
}