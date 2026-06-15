/**
 * app/oauth/success/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Landing page after a successful OAuth callback.
 *
 * The backend redirects here at the end of the OAuth flow:
 *   FRONTEND_URL/oauth/success?platform=linkedin&status=success
 *   FRONTEND_URL/oauth/success?platform=linkedin&status=error&message=...
 *
 * This page:
 *   1. Reads the query params
 *   2. postMessages the result to window.opener (the AccountsTab)
 *   3. Closes itself
 *
 * Backend env var: FRONTEND_URL=https://app.postpilot.io
 * (the backend appends /oauth/success — set that in FRONTEND_URL or adjust
 *  the redirect in handler.go to point here explicitly)
 *
 * Security:
 *   - Only sends postMessage to same origin (window.opener origin is
 *     validated browser-side in linkedinAuth.ts via event.origin check)
 *   - No sensitive data in the message — just success/error status
 *   - If window.opener is null (direct navigation, not a popup), we
 *     redirect to the accounts page instead
 */

"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

// ─── Inner component (needs useSearchParams, must be inside Suspense) ─────────

function OAuthSuccessInner() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<"pending" | "success" | "error">("pending")

  useEffect(() => {
    const status = searchParams.get("status") ?? "success"
    const platform = searchParams.get("platform") ?? "unknown"
    const errorMsg = searchParams.get("message") ?? "OAuth failed"

    const message =
      status === "error"
        ? { type: "OAUTH_COMPLETE", status: "error",   platform, error: errorMsg }
        : { type: "OAUTH_COMPLETE", status: "success", platform }

    if (window.opener && !window.opener.closed) {
      // Send to opener and close this popup
      window.opener.postMessage(message, window.location.origin)
      setState(status === "error" ? "error" : "success")
      // Small delay so user briefly sees the success/error state
      setTimeout(() => window.close(), 800)
    } else {
      // Direct navigation (not a popup) — redirect to accounts
      window.location.replace("/settings/accounts")
    }
  }, [searchParams])

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#fafafa",
      padding: 24,
    }}>
      {state === "pending" && (
        <>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "3px solid #e5e7eb",
            borderTopColor: "#0A66C2",
            animation: "spin 0.8s linear infinite",
            marginBottom: 16,
          }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>
            Completing sign-in…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}

      {state === "success" && (
        <>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#d1fae5",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            {/* Checkmark */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#065f46", marginBottom: 6 }}>
            Account connected
          </p>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Closing this window…
          </p>
        </>
      )}

      {state === "error" && (
        <>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#fee2e2",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>
            Connection failed
          </p>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Closing this window…
          </p>
        </>
      )}
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading…</p>
      </div>
    }>
      <OAuthSuccessInner />
    </Suspense>
  )
}