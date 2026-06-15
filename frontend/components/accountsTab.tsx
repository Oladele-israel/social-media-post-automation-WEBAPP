"use client"

/**
 * AccountsTab — Multi-platform social accounts management
 *
 * API integration:
 *  GET    /auth/social                          → fetch all accounts
 *  GET    /auth/social/{platform}/connect       → returns { url: string } (OAuth URL)
 *  GET    /auth/social/{platform}/profile       → fetch single account
 *  DELETE /auth/social/{platform}/disconnect    → remove account
 *
 * OAuth flow (no token in URL):
 *  1. Frontend calls GET /connect via axios (Bearer token in header)
 *  2. Backend validates JWT, returns { url: "https://linkedin.com/oauth/..." }
 *  3. Frontend opens that URL in a popup
 *  4. User approves → platform calls /callback → Go stores token → redirects to FRONTEND_URL
 *  5. Popup closes → we detect closure → refetch all accounts
 *
 * Uses the project's shared axios `client` instance (lib/client.ts) which handles:
 *   - Bearer token injection from cookieStore
 *   - Automatic silent token refresh on 401
 *   - Redirect to /login when refresh fails
 */

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Plus, Trash2, RefreshCw, CheckCircle2, AlertTriangle,
  Clock, ExternalLink, MoreHorizontal, Users, ShieldCheck,
  Loader2, X, Link2Off, Wifi, ChevronRight,
  BarChart2, Info, Zap,
} from "lucide-react"
import axios, { type AxiosError } from "axios"
import { client } from "@/lib/client"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EXPIRY_WARNING_DAYS = 14
const OAUTH_TIMEOUT_MS    = 5 * 60 * 1_000  // 5 minutes
const POPUP_POLL_INTERVAL = 300              // ms
const POST_CLOSE_DELAY    = 400             // ms — let Go callback finish writing

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Platform      = "linkedin" | "x" | "instagram"
export type AccountStatus = "connected" | "expired" | "error" | "reconnecting" | "pending"

export interface SocialPage {
  id:            string
  name:          string
  followerCount: number
  type:          "page" | "organization"
}

export interface RateLimit {
  remaining: number
  limit:     number
  resetsAt:  string
}

/**
 * Frontend-normalised account — all fields the UI needs are present.
 * Some are derived from the backend payload, others are defaulted.
 */
export interface SocialAccount {
  // From API
  id:             string
  userId:         string
  platform:       Platform
  handle:         string          // ← platform_user_id
  name:           string
  email:          string
  tokenExpiresAt: string          // ← token_expires_at (ISO)
  connectedAt:    string          // ← created_at (ISO)
  updatedAt:      string          // ← updated_at (ISO)
  // Derived
  status:         AccountStatus
  // Defaulted — extend when API exposes these
  bio:                     string
  profileImageUrl:         string | null
  pages:                   SocialPage[]
  postsPublishedThisMonth: number
  followersCount:          number
  rateLimit?:              RateLimit
  accountType?:            "personal" | "business" | "creator"
}

/** Raw shape from GET /auth/social and /auth/social/{p}/profile */
interface APISocialAccount {
  id:               string
  user_id:          string
  platform:         Platform
  platform_user_id: string
  name:             string
  email:            string
  token_expires_at: string
  created_at:       string
  updated_at:       string
}

type ToastVariant = "success" | "error" | "info" | "warning"
interface Toast { id: string; message: string; variant: ToastVariant }

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ error?: string; message?: string | string[] }>
    const data  = axErr.response?.data
    if (data?.error)                  return data.error
    if (Array.isArray(data?.message)) return data.message.join(", ")
    if (data?.message)                return data.message as string
  }
  if (err instanceof Error) return err.message
  return fallback
}

function normaliseAccount(raw: APISocialAccount): SocialAccount {
  const expiresAt = new Date(raw.token_expires_at)
  const status: AccountStatus = expiresAt <= new Date() ? "expired" : "connected"
  return {
    id:             raw.id,
    userId:         raw.user_id,
    platform:       raw.platform,
    handle:         raw.platform_user_id,
    name:           raw.name,
    email:          raw.email,
    tokenExpiresAt: raw.token_expires_at,
    connectedAt:    raw.created_at,
    updatedAt:      raw.updated_at,
    status,
    bio:                     "",
    profileImageUrl:         null,
    pages:                   [],
    postsPublishedThisMonth: 0,
    followersCount:          0,
    rateLimit:               undefined,
    accountType:             undefined,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Social API layer
// ─────────────────────────────────────────────────────────────────────────────

const socialApi = {
  /**
   * GET /auth/social
   * Returns all connected social accounts for the authenticated user.
   */
  fetchAll: async (): Promise<SocialAccount[]> => {
    const { data } = await client.get<{ accounts: APISocialAccount[]; total: number }>(
      "/auth/social"
    )
    return (data.accounts ?? []).map(normaliseAccount)
  },

  /**
   * GET /auth/social/{platform}/profile
   * Fetches a single connected account — used after reconnect to refresh metadata.
   */
  fetchProfile: async (platform: Platform): Promise<SocialAccount> => {
    const { data } = await client.get<APISocialAccount>(
      `/auth/social/${platform}/profile`
    )
    return normaliseAccount(data)
  },

  /**
   * GET /auth/social/{platform}/connect  (OAuth entry point)
   *
   * Step 1: axios calls /connect with Bearer token → backend returns { url }
   * Step 2: we open that URL (the PLATFORM's auth page) in a popup
   * Step 3: user approves → platform → /callback → Go → FRONTEND_URL (closes popup)
   * Step 4: poll detects popup.closed → call onSuccess
   *
   * No token is ever passed as a URL query param.
   */
openOAuthPopup: async (
  platform: Platform,
  onSuccess: () => void,
  onError: (reason: "fetch_failed" | "timeout") => void
): Promise<void> => {
  let authURL: string
  try {
    const { data } = await client.get<{ url: string }>(
      `/auth/social/${platform}/connect`
    )
    authURL = data.url
  } catch {
    onError("fetch_failed")
    return
  }

  const W    = 560
  const H    = 680
  const left = Math.round(window.screenX + (window.outerWidth  - W) / 2)
  const top  = Math.round(window.screenY + (window.outerHeight - H) / 2)

  const popup = window.open(
    authURL,
    `postpilot_oauth_${platform}`,
    `width=${W},height=${H},left=${left},top=${top},toolbar=0,scrollbars=1,status=1`
  )

  if (!popup) {
    window.location.href = authURL
    return
  }

  let done = false

  const finish = (success: boolean) => {
    if (done) return
    done = true
    clearInterval(pollTimer)
    clearTimeout(hardTimeout)
    window.removeEventListener("message", messageHandler)
    if (success) {
      setTimeout(onSuccess, 300)
    } else {
      if (!popup.closed) popup.close()
      onError("timeout")
    }
  }

  // Primary — backend HTML page posts a message then closes itself
  const messageHandler = (e: MessageEvent) => {
    if (e.data?.type === "OAUTH_SUCCESS") finish(true)
    if (e.data?.type === "OAUTH_ERROR")   finish(false)
  }
  window.addEventListener("message", messageHandler)

  // Fallback — if postMessage never fires, detect closure directly
  const pollTimer = setInterval(() => {
    if (popup.closed) finish(true)
  }, 300)

  // Hard timeout at 5 minutes
  const hardTimeout = setTimeout(() => finish(false), 5 * 60 * 1_000)
},

  /**
   * DELETE /auth/social/{platform}/disconnect
   */
  disconnect: async (platform: Platform): Promise<void> => {
    await client.delete(`/auth/social/${platform}/disconnect`)
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform config
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<Platform, {
  label:        string
  color:        string
  lightBg:      string
  borderAccent: string
  Logo:         React.FC<{ size?: number }>
  permissions:  { icon: React.ReactNode; text: string }[]
  notice?:      React.ReactNode
}> = {
  linkedin: {
    label:        "LinkedIn",
    color:        "#0A66C2",
    lightBg:      "#e8f1fc",
    borderAccent: "rgba(10,102,194,0.18)",
    Logo: ({ size = 20 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <rect width="24" height="24" rx="5" fill="#0A66C2" />
        <path d="M7.5 9.5H5V18.5H7.5V9.5ZM6.25 8.5C5.56 8.5 5 7.94 5 7.25S5.56 6 6.25 6 7.5 6.56 7.5 7.25 6.94 8.5 6.25 8.5ZM19 18.5H16.5V13.75C16.5 12.09 15.62 11.5 14.62 11.5c-1.06 0-1.87.81-1.87 2.25V18.5H10.25V9.5H12.63V10.75C13.06 9.97 14.06 9.25 15.31 9.25 17.44 9.25 19 10.63 19 13.38V18.5Z" fill="white" />
      </svg>
    ),
    permissions: [
      { icon: <Users className="w-3.5 h-3.5" />,       text: "Read your public profile and name" },
      { icon: <ShieldCheck className="w-3.5 h-3.5" />,  text: "Post on your behalf (you control scheduling)" },
      { icon: <ExternalLink className="w-3.5 h-3.5" />, text: "Access pages and organisations you manage" },
    ],
  },
  x: {
    label:        "X (Twitter)",
    color:        "#000000",
    lightBg:      "#f0f0f0",
    borderAccent: "rgba(0,0,0,0.12)",
    Logo: ({ size = 20 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <rect width="24" height="24" rx="5" fill="#000000" />
        <path d="M13.545 10.239L18.988 4H17.698L12.965 9.412 9.19 4H4.5L10.209 12.777 4.5 19.246H5.79l4.997-5.696 3.02 5.696H19.5L13.545 10.239ZM11.452 12.847l-.592-.851L6.254 4.992H8.578l3.4 5.204.569.851 4.13 7.252H14.375l-2.923-4.452Z" fill="white" />
      </svg>
    ),
    permissions: [
      { icon: <Users className="w-3.5 h-3.5" />,       text: "Read your public profile and followers" },
      { icon: <ShieldCheck className="w-3.5 h-3.5" />,  text: "Post, reply, and delete tweets on your behalf" },
      { icon: <BarChart2 className="w-3.5 h-3.5" />,    text: "Read tweet engagement and analytics" },
    ],
    notice: (
      <div
        className="mx-6 mt-4 flex items-start gap-2 p-3 rounded-xl"
        style={{ background: "#f0f9ff", border: "1px solid rgba(59,130,246,0.2)" }}
      >
        <Zap className="w-3.5 h-3.5 mt-px flex-shrink-0" style={{ color: "#3b82f6" }} />
        <p className="text-[11px]" style={{ color: "#1e40af" }}>
          <strong>Free:</strong> 100 posts/mo · <strong>Basic ($100/mo):</strong> 3,000 posts/mo
        </p>
      </div>
    ),
  },
  instagram: {
    label:        "Instagram",
    color:        "#C13584",
    lightBg:      "#fce7f3",
    borderAccent: "rgba(193,53,132,0.18)",
    Logo: ({ size = 20 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="ig-g" x1="0" y1="24" x2="24" y2="0">
            <stop offset="0%"   stopColor="#f09433" />
            <stop offset="25%"  stopColor="#e6683c" />
            <stop offset="50%"  stopColor="#dc2743" />
            <stop offset="75%"  stopColor="#cc2366" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="5" fill="url(#ig-g)" />
        <rect x="6" y="6" width="12" height="12" rx="3.5" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="16.3" cy="7.7" r="0.8" fill="white" />
      </svg>
    ),
    permissions: [
      { icon: <Users className="w-3.5 h-3.5" />,       text: "Read your business/creator profile" },
      { icon: <ShieldCheck className="w-3.5 h-3.5" />,  text: "Publish photos, videos, carousels & Reels" },
      { icon: <BarChart2 className="w-3.5 h-3.5" />,    text: "Read post insights and performance metrics" },
      { icon: <ExternalLink className="w-3.5 h-3.5" />, text: "Access connected Facebook Pages" },
    ],
    notice: (
      <div
        className="mx-6 mt-4 flex items-start gap-2 p-3 rounded-xl"
        style={{ background: "#fef3c7", border: "1px solid rgba(245,158,11,0.25)" }}
      >
        <Info className="w-3.5 h-3.5 mt-px flex-shrink-0" style={{ color: "#d97706" }} />
        <p className="text-[11px]" style={{ color: "#92400e" }}>
          <strong>Business or Creator account required.</strong> Switch your account type in Instagram settings first.
        </p>
      </div>
    ),
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()

const fmtNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n)

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({ name, imageUrl, size = 40, color }: {
  name: string; imageUrl: string | null; size?: number; color: string
}) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.3, fontWeight: 700, flexShrink: 0, overflow: "hidden",
        userSelect: "none",
      }}
      aria-hidden="true"
    >
      {imageUrl
        ? <img src={imageUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials(name)
      }
    </div>
  )
}

function StatusBadge({ status }: { status: AccountStatus }) {
  const map: Record<AccountStatus, { bg: string; color: string; dot: string; label: string }> = {
    connected:    { bg: "#d1fae5", color: "#065f46", dot: "#10b981", label: "Connected" },
    expired:      { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b", label: "Expired" },
    error:        { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444", label: "Error" },
    reconnecting: { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6", label: "Reconnecting" },
    pending:      { bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af", label: "Pending" },
  }
  const c = map[status]
  return (
    <span
      role="status"
      aria-label={`Account status: ${c.label}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
        background: c.bg, color: c.color,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
          background: c.dot,
          boxShadow: status === "connected" ? "0 0 0 2px rgba(16,185,129,0.25)" : "none",
        }}
      />
      {c.label}
    </span>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const map: Record<ToastVariant, { bg: string; border: string; icon: React.ReactNode; color: string }> = {
    success: { bg: "#f0fdf4", border: "rgba(16,185,129,0.3)",  icon: <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981" }} />, color: "#065f46" },
    error:   { bg: "#fef2f2", border: "rgba(239,68,68,0.3)",   icon: <AlertTriangle style={{ width: 16, height: 16, color: "#ef4444" }} />, color: "#991b1b" },
    info:    { bg: "#eff6ff", border: "rgba(59,130,246,0.3)",  icon: <Wifi style={{ width: 16, height: 16, color: "#3b82f6" }} />, color: "#1e40af" },
    warning: { bg: "#fffbeb", border: "rgba(245,158,11,0.3)",  icon: <AlertTriangle style={{ width: 16, height: 16, color: "#f59e0b" }} />, color: "#92400e" },
  }
  const c = map[toast.variant]
  return (
    <div
      role="alert"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: 14, border: `1px solid ${c.border}`,
        background: c.bg, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        minWidth: 260, maxWidth: 360,
      }}
    >
      <span aria-hidden="true">{c.icon}</span>
      <p style={{ fontSize: 12, fontWeight: 600, flex: 1, color: c.color, margin: 0 }}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: c.color, padding: 2, display: "flex", alignItems: "center",
        }}
      >
        <X style={{ width: 12, height: 12 }} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Account Card
// ─────────────────────────────────────────────────────────────────────────────

function AccountCard({ account, onDelete, onReconnect }: {
  account:     SocialAccount
  onDelete:    (a: SocialAccount) => void
  onReconnect: (a: SocialAccount) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef   = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const cfg        = PLATFORM_CONFIG[account.platform]
  const { Logo }   = cfg
  const days          = daysUntil(account.tokenExpiresAt)
  const isExpiring    = account.status === "connected" && days <= EXPIRY_WARNING_DAYS && days > 0
  const needsAttention = account.status === "expired" || account.status === "error"

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [menuOpen])

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false)
        menuBtnRef.current?.focus()
      }
    }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [menuOpen])

  return (
    <article
      aria-label={`${account.name} ${cfg.label} account`}
      style={{
        background: "#fff",
        border: `1px solid ${needsAttention ? "rgba(245,158,11,0.35)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar name={account.name} imageUrl={account.profileImageUrl} size={40} color={cfg.color} />
          <div style={{ position: "absolute", bottom: -3, right: -3 }} aria-hidden="true">
            <Logo size={16} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", letterSpacing: "-0.015em", lineHeight: 1.3 }}>
              {account.name}
            </span>
            <StatusBadge status={account.status} />
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "2px 0 0" }}>
            {account.handle}
          </p>
          {account.email && (
            <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "1px 0 0" }}>
              {account.email}
            </p>
          )}
          {account.accountType && (
            <span style={{
              display: "inline-block", marginTop: 3,
              fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
              textTransform: "capitalize", background: cfg.lightBg, color: cfg.color,
            }}>
              {account.accountType}
            </span>
          )}
        </div>

        {/* Context menu */}
        <div style={{ position: "relative", flexShrink: 0 }} ref={menuRef}>
          <button
            ref={menuBtnRef}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`Options for ${account.name}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            style={{
              width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
              background: menuOpen ? "#f0f2f7" : "transparent",
              color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <MoreHorizontal style={{ width: 15, height: 15 }} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label={`Actions for ${account.name}`}
              style={{
                position: "absolute", right: 0, top: 36, width: 180, borderRadius: 12, zIndex: 20,
                background: "#fff", border: "1px solid rgba(0,0,0,0.09)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: "4px 0",
              }}
            >
              {needsAttention && (
                <MenuBtn
                  onClick={() => { setMenuOpen(false); onReconnect(account) }}
                  icon={<RefreshCw style={{ width: 12, height: 12 }} />}
                  label="Reconnect"
                  color="#1a5c3a"
                  hoverBg="#e6f5ee"
                />
              )}
              <MenuBtn
                onClick={() => { setMenuOpen(false); onDelete(account) }}
                icon={<Trash2 style={{ width: 12, height: 12 }} />}
                label="Disconnect"
                color="#ef4444"
                hoverBg="#fee2e2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Expiry warning banner */}
      {isExpiring && (
        <Banner
          icon={<Clock style={{ width: 13, height: 13, color: "#d97706", flexShrink: 0 }} />}
          text={`Expires in ${days} day${days !== 1 ? "s" : ""}`}
          action={{ label: "Reconnect", onClick: () => onReconnect(account) }}
        />
      )}

      {/* Expired / error banner */}
      {needsAttention && (
        <Banner
          icon={<AlertTriangle style={{ width: 13, height: 13, color: "#d97706", flexShrink: 0 }} />}
          text={account.status === "expired" ? `Expired ${formatDate(account.tokenExpiresAt)}` : "Authentication error"}
          action={{ label: "Reconnect now", onClick: () => onReconnect(account) }}
        />
      )}

      {/* Reconnecting state */}
      {account.status === "reconnecting" && (
        <div
          role="status"
          aria-label="Reconnecting account"
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10,
            background: "#eff6ff", border: "1px solid rgba(59,130,246,0.2)",
          }}
        >
          <Loader2 aria-hidden="true" style={{ width: 13, height: 13, color: "#3b82f6", animation: "pp-spin 1s linear infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#1e40af" }}>Reconnecting…</span>
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
        paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)",
      }}>
        <Stat label="Posts / mo" value={String(account.postsPublishedThisMonth)} />
        <Stat label="Followers"  value={fmtNum(account.followersCount)} />
        <Stat label="Since"      value={formatDate(account.connectedAt)} small />
      </div>

      {/* Rate limit bar */}
      {account.rateLimit && <RateLimitBar rateLimit={account.rateLimit} />}

      {/* Managed pages */}
      {account.pages.length > 0 && (
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: 6, margin: "0 0 6px" }}>
            Managed pages
          </p>
          {account.pages.map((page) => (
            <div
              key={page.id}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 10, marginBottom: 4,
                background: "#f5f6fa", border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 6, background: cfg.lightBg, color: cfg.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }} aria-hidden="true">
                {page.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                  {page.name}
                </p>
                <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>{page.followerCount.toLocaleString()} followers</p>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: cfg.lightBg, color: cfg.color, textTransform: "capitalize" }}>
                {page.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro helpers
// ─────────────────────────────────────────────────────────────────────────────

function MenuBtn({ onClick, icon, label, color, hoverBg }: {
  onClick: () => void; icon: React.ReactNode; label: string; color: string; hoverBg: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", fontSize: 12, fontWeight: 600, color,
        background: hov ? hoverBg : "transparent", border: "none",
        cursor: "pointer", textAlign: "left",
      }}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}

function Banner({ icon, text, action }: {
  icon:   React.ReactNode
  text:   string
  action: { label: string; onClick: () => void }
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10,
      background: "#fef3c7", border: "1px solid rgba(245,158,11,0.25)",
    }}>
      <span aria-hidden="true">{icon}</span>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#92400e", flex: 1, margin: 0 }}>{text}</p>
      <button
        onClick={action.onClick}
        style={{
          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 7,
          background: "#f59e0b", color: "#fff", border: "none",
          cursor: "pointer", flexShrink: 0,
        }}
      >
        {action.label}
      </button>
    </div>
  )
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: 2, margin: "0 0 2px" }}>
        {label}
      </p>
      <p style={{ fontSize: small ? 11 : 17, fontWeight: 700, color: "#111827", letterSpacing: small ? 0 : "-0.025em", lineHeight: 1.2, margin: 0 }}>
        {value}
      </p>
    </div>
  )
}

function RateLimitBar({ rateLimit }: { rateLimit: RateLimit }) {
  const pct   = Math.round((rateLimit.remaining / rateLimit.limit) * 100)
  const color = pct > 50 ? "#10b981" : pct > 20 ? "#f59e0b" : "#ef4444"
  const hrs   = Math.ceil((new Date(rateLimit.resetsAt).getTime() - Date.now()) / 3_600_000)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af" }}>
          API Rate Limit
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color }}>
          {rateLimit.remaining}/{rateLimit.limit} · resets {hrs}h
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="API rate limit remaining"
        style={{ height: 5, borderRadius: 999, background: "#f3f4f6", overflow: "hidden" }}
      >
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: color, transition: "width 0.4s ease" }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Column
// ─────────────────────────────────────────────────────────────────────────────

function PlatformColumn({ platform, accounts, loading, onAdd, onDelete, onReconnect }: {
  platform:    Platform
  accounts:    SocialAccount[]
  loading:     boolean
  onAdd:       (p: Platform) => void
  onDelete:    (a: SocialAccount) => void
  onReconnect: (a: SocialAccount) => void
}) {
  const cfg            = PLATFORM_CONFIG[platform]
  const { Logo }       = cfg
  const attentionCount = accounts.filter((a) => a.status === "expired" || a.status === "error").length

  return (
    <section aria-label={`${cfg.label} accounts`} style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0 }}>
      {/* Column header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        paddingBottom: 12, borderBottom: `2px solid ${cfg.borderAccent}`,
      }}>
        <Logo size={22} />
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#111827", flex: 1, margin: 0 }}>{cfg.label}</h2>
        <span
          aria-label={`${accounts.length} ${cfg.label} account${accounts.length !== 1 ? "s" : ""}`}
          style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: cfg.lightBg, color: cfg.color }}
        >
          {accounts.length}
        </span>
        {attentionCount > 0 && (
          <span
            aria-label={`${attentionCount} account${attentionCount !== 1 ? "s" : ""} need attention`}
            style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "#fef3c7", color: "#92400e" }}
          >
            ⚠ {attentionCount}
          </span>
        )}
      </div>

      {/* Cards / skeleton / empty */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {loading ? (
          <div
            aria-busy="true"
            aria-label={`Loading ${cfg.label} accounts`}
            style={{
              height: 120, borderRadius: 16,
              background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)",
              backgroundSize: "200% 100%", animation: "pp-shimmer 1.4s infinite",
            }}
          />
        ) : accounts.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "32px 16px", textAlign: "center", borderRadius: 16,
            border: `2px dashed ${cfg.borderAccent}`, background: "#fafafa", gap: 10,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.lightBg, display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
              <Logo size={22} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4, margin: "0 0 4px" }}>No accounts</p>
              <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5, margin: 0 }}>
                Connect your {cfg.label} account to start publishing.
              </p>
            </div>
            <button
              onClick={() => onAdd(platform)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 34, padding: "0 14px", borderRadius: 10, border: "none",
                background: cfg.color, color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: "pointer", boxShadow: `0 2px 8px ${cfg.color}40`,
              }}
            >
              <Plus style={{ width: 13, height: 13 }} aria-hidden="true" />
              Connect {cfg.label}
            </button>
          </div>
        ) : (
          <>
            {accounts.map((a) => (
              <AccountCard key={a.id} account={a} onDelete={onDelete} onReconnect={onReconnect} />
            ))}
          </>
        )}

        {/* "Add another" — only shown when accounts exist */}
        {!loading && accounts.length > 0 && (
          <button
            onClick={() => onAdd(platform)}
            aria-label={`Add another ${cfg.label} account`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              height: 38, borderRadius: 12, cursor: "pointer",
              background: "transparent", border: `2px dashed ${cfg.borderAccent}`,
              color: cfg.color, fontSize: 12, fontWeight: 600, transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = cfg.lightBg }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
          >
            <Plus style={{ width: 13, height: 13 }} aria-hidden="true" />
            Add account
          </button>
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Picker Modal
// ─────────────────────────────────────────────────────────────────────────────

function PlatformPickerModal({ onSelect, onCancel }: {
  onSelect: (p: Platform) => void
  onCancel: () => void
}) {
  const firstBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstBtnRef.current?.focus()
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [onCancel])

  const platforms: { platform: Platform; sub: string }[] = [
    { platform: "linkedin",  sub: "Profiles, pages & organisations" },
    { platform: "x",         sub: "Personal & organisation accounts" },
    { platform: "instagram", sub: "Business & creator accounts only" },
  ]

  return (
    <Backdrop onClose={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        style={{
          background: "#fff", borderRadius: 20, overflow: "hidden",
          width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <ModalHeader id="picker-title" title="Add account" onClose={onCancel} />
        <p style={{ padding: "0 24px 16px", fontSize: 13, color: "#6b7280", margin: 0 }}>
          Choose a platform to connect.
        </p>
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {platforms.map(({ platform, sub }, idx) => {
            const c      = PLATFORM_CONFIG[platform]
            const { Logo } = c
            return (
              <PlatformPickerRow
                key={platform}
                ref={idx === 0 ? firstBtnRef : undefined}
                logo={<Logo size={32} />}
                label={c.label}
                sub={sub}
                lightBg={c.lightBg}
                borderAccent={c.borderAccent}
                onClick={() => onSelect(platform)}
              />
            )
          })}
        </div>
      </div>
    </Backdrop>
  )
}

const PlatformPickerRow = ({ logo, label, sub, lightBg, borderAccent, onClick, ref }: {
  logo:         React.ReactNode
  label:        string
  sub:          string
  lightBg:      string
  borderAccent: string
  onClick:      () => void
  ref?:         React.Ref<HTMLButtonElement>
}) => {
  const [hov, setHov] = useState(false)
  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 14,
        background: hov ? lightBg : "#fafafa",
        border: `1px solid ${hov ? borderAccent : "rgba(0,0,0,0.08)"}`,
        cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%",
      }}
    >
      <span aria-hidden="true">{logo}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, margin: "1px 0 0" }}>{sub}</p>
      </div>
      <ChevronRight style={{ width: 16, height: 16, color: "#d1d5db", flexShrink: 0 }} aria-hidden="true" />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Connect Platform Modal
// ─────────────────────────────────────────────────────────────────────────────

function ConnectPlatformModal({ platform, loading, onConnect, onCancel }: {
  platform:  Platform
  loading:   boolean
  onConnect: () => void
  onCancel:  () => void
}) {
  const cfg         = PLATFORM_CONFIG[platform]
  const { Logo }    = cfg
  const connectBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    connectBtnRef.current?.focus()
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onCancel() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [onCancel, loading])

  return (
    <Backdrop onClose={loading ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
        aria-busy={loading}
        style={{
          background: "#fff", borderRadius: 20, overflow: "hidden",
          width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Logo size={36} />
              <div>
                <h2 id="connect-title" style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", margin: 0 }}>
                  Connect {cfg.label}
                </h2>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
                  Authorise PostPilot to manage your content
                </p>
              </div>
            </div>
            {!loading && <CloseButton onClick={onCancel} />}
          </div>
        </div>

        {cfg.notice}

        {/* Permissions */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: 12, margin: "0 0 12px" }}>
            PostPilot will be able to
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: 10, margin: 0, padding: 0, listStyle: "none" }}>
            {cfg.permissions.map((p, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: cfg.lightBg, color: cfg.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }} aria-hidden="true">
                  {p.icon}
                </div>
                <p style={{ fontSize: 13, color: "#374151", paddingTop: 6, margin: 0 }}>{p.text}</p>
              </li>
            ))}
          </ul>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, padding: 12, borderRadius: 10,
            background: "#f5f6fa", border: "1px solid rgba(0,0,0,0.07)",
          }}>
            <ShieldCheck style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0, color: "#1a5c3a" }} aria-hidden="true" />
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
              PostPilot never stores your password. Revoke access from {cfg.label}'s security settings at any time.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "0 24px 24px", display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, height: 42, borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: "#f5f6fa", border: "1px solid rgba(0,0,0,0.1)", color: "#374151",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            ref={connectBtnRef}
            onClick={onConnect}
            disabled={loading}
            aria-label={loading ? `Waiting for ${cfg.label} authorisation` : `Continue with ${cfg.label}`}
            style={{
              flex: 1, height: 42, borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: loading ? "#9ca3af" : cfg.color, color: "#fff", border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: loading ? "none" : `0 2px 8px ${cfg.color}55`, transition: "all 0.15s",
            }}
          >
            {loading
              ? <><Loader2 aria-hidden="true" style={{ width: 16, height: 16, animation: "pp-spin 1s linear infinite" }} /> Waiting for authorisation…</>
              : <><Logo size={16} /> Continue with {cfg.label}</>
            }
          </button>
        </div>
      </div>
    </Backdrop>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Disconnect Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────

function DisconnectModal({ account, loading, onConfirm, onCancel }: {
  account:   SocialAccount
  loading:   boolean
  onConfirm: () => void
  onCancel:  () => void
}) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { confirmBtnRef.current?.focus() }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onCancel() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [onCancel, loading])

  return (
    <Backdrop onClose={loading ? undefined : onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="disconnect-title"
        aria-describedby="disconnect-desc"
        style={{
          background: "#fff", borderRadius: 20, padding: 24,
          width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }} aria-hidden="true">
          <Link2Off style={{ width: 20, height: 20, color: "#ef4444" }} />
        </div>
        <h2 id="disconnect-title" style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Disconnect account?
        </h2>
        <p id="disconnect-desc" style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, margin: "0 0 6px" }}>
          You're about to disconnect <strong style={{ color: "#374151" }}>{account.name}</strong> ({PLATFORM_CONFIG[account.platform].label}) from PostPilot.
        </p>
        <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 24, margin: "0 0 24px" }}>
          Scheduled posts will be paused. You can reconnect at any time.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, height: 40, borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: "#f5f6fa", border: "1px solid rgba(0,0,0,0.1)", color: "#374151", cursor: "pointer",
            }}
          >
            Keep connected
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, height: 40, borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: loading ? "#fca5a5" : "#ef4444", color: "#fff", border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: loading ? "none" : "0 2px 8px rgba(239,68,68,0.3)",
            }}
          >
            {loading
              ? <><Loader2 aria-hidden="true" style={{ width: 13, height: 13, animation: "pp-spin 1s linear infinite" }} /> Disconnecting…</>
              : <><Trash2 aria-hidden="true" style={{ width: 13, height: 13 }} /> Disconnect</>
            }
          </button>
        </div>
      </div>
    </Backdrop>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout primitives
// ─────────────────────────────────────────────────────────────────────────────

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose() }}
    >
      {children}
    </div>
  )
}

function ModalHeader({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  return (
    <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 id={id} style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", margin: 0 }}>{title}</h2>
      <CloseButton onClick={onClose} />
    </div>
  )
}

function CloseButton({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
        background: hov ? "#fee2e2" : "#f5f6fa",
        color: hov ? "#ef4444" : "#9ca3af",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
      }}
    >
      <X style={{ width: 14, height: 14 }} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS injection
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @keyframes pp-spin    { to { transform: rotate(360deg); } }
  @keyframes pp-shimmer {
    0%,100% { background-position: 200% 0; }
    50%     { background-position: -200% 0; }
  }
  .pp-accounts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: start;
  }
  @media (min-width: 640px)  { .pp-accounts-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .pp-accounts-grid { grid-template-columns: repeat(3, 1fr); } }
  .pp-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  @media (max-width: 480px) { .pp-summary-grid { grid-template-columns: repeat(2, 1fr); } }
  .pp-coming-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  @media (max-width: 480px) { .pp-coming-grid { grid-template-columns: 1fr; } }
  .pp-page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  @media (prefers-reduced-motion: reduce) {
    .pp-spin    { animation: none !important; }
    .pp-shimmer { animation: none !important; }
  }
`

function StyleInjector() {
  return <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function AccountsTab() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [accounts,        setAccounts]        = useState<SocialAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [fetchError,      setFetchError]      = useState<string | null>(null)

  // Platform picker modal (step 1 — choose platform)
  const [showPicker,      setShowPicker]      = useState(false)

  // Connect modal (step 2 — confirm + open OAuth popup)
  const [connectPlatform, setConnectPlatform] = useState<Platform | null>(null)
  const [connecting,      setConnecting]      = useState(false)

  // Disconnect confirm modal
  const [deleteTarget,    setDeleteTarget]    = useState<SocialAccount | null>(null)
  const [deleting,        setDeleting]        = useState(false)

  // Toast notifications
  const [toasts,          setToasts]          = useState<Toast[]>([])

  // Track accounts at the time connect started (for "was a new one added?" check)
  const accountsRef = useRef<SocialAccount[]>([])
  useEffect(() => { accountsRef.current = accounts }, [accounts])

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2)}`
    setToasts((p) => [...p, { id, message, variant }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id))
  }, [])

  // ── Initial data fetch ─────────────────────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    setFetchError(null)
    try {
      const data = await socialApi.fetchAll()
      setAccounts(data)
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to load accounts")
      setFetchError(msg)
      addToast(msg, "error")
    } finally {
      setLoadingAccounts(false)
    }
  }, [addToast])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  // ── OAuth connect ──────────────────────────────────────────────────────────
  /**
   * Called when the user clicks "Continue with {platform}".
   * Calls GET /auth/social/{platform}/connect via axios (Bearer token in header),
   * gets back { url }, opens that URL in a popup, polls for closure, then refetches.
   */
  const handleConnect = useCallback(() => {
    if (!connectPlatform) return

    const platform  = connectPlatform
    const prevIds   = new Set(accountsRef.current.map((a) => a.id))

    setConnecting(true)

    socialApi.openOAuthPopup(
      platform,
      // onSuccess — popup closed (OAuth complete or user cancelled)
      async () => {
        try {
          const fresh = await socialApi.fetchAll()
          setAccounts(fresh)
          const added = fresh.find((a) => !prevIds.has(a.id) && a.platform === platform)
          if (added) {
            addToast(`${added.name} connected to ${PLATFORM_CONFIG[platform].label}`, "success")
          }
        } catch {
          addToast("Could not refresh accounts — please reload", "warning")
        } finally {
          setConnecting(false)
          setConnectPlatform(null)
        }
      },
      // onError
      (reason) => {
        setConnecting(false)
        setConnectPlatform(null)
        if (reason === "fetch_failed") {
          addToast("Could not start authorisation — please try again", "error")
        } else {
          addToast("Connection timed out — please try again", "error")
        }
      }
    )
  }, [connectPlatform, addToast])

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const handleDisconnectConfirm = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { id, name, platform } = deleteTarget
    try {
      await socialApi.disconnect(platform)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      setDeleteTarget(null)
      addToast(`${name} disconnected`, "info")
    } catch (err) {
      addToast(extractErrorMessage(err, "Failed to disconnect — try again"), "error")
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, addToast])

  // ── Reconnect ──────────────────────────────────────────────────────────────
  /**
   * Re-runs OAuth for expired/error accounts.
   * Optimistically marks the account as "reconnecting" immediately.
   * After the popup closes, refetches the profile and replaces the stale entry.
   */
  const handleReconnect = useCallback((account: SocialAccount) => {
    setAccounts((prev) =>
      prev.map((a) => a.id === account.id ? { ...a, status: "reconnecting" as AccountStatus } : a)
    )

    socialApi.openOAuthPopup(
      account.platform,
      async () => {
        try {
          const refreshed = await socialApi.fetchProfile(account.platform)
          setAccounts((prev) =>
            prev.map((a) =>
              a.id === account.id
                ? { ...refreshed, id: account.id }  // keep local ID stable
                : a
            )
          )
          addToast(`${account.name} reconnected`, "success")
        } catch {
          setAccounts((prev) =>
            prev.map((a) => a.id === account.id ? { ...a, status: "error" as AccountStatus } : a)
          )
          addToast(`Failed to reconnect ${account.name}`, "error")
        }
      },
      () => {
        setAccounts((prev) =>
          prev.map((a) => a.id === account.id ? { ...a, status: "error" as AccountStatus } : a)
        )
        addToast(`Reconnect timed out for ${account.name}`, "error")
      }
    )
  }, [addToast])

  // ── Derived values ─────────────────────────────────────────────────────────
  const platforms: Platform[] = ["linkedin", "x", "instagram"]

  const attentionAccounts = accounts.filter((a) => a.status === "expired" || a.status === "error")

  const summaryStats = [
    {
      label: "Accounts",
      value: String(accounts.length),
      color: "#374151", bg: "#f3f4f6",
    },
    {
      label: "Active",
      value: String(accounts.filter((a) => a.status === "connected" || a.status === "reconnecting").length),
      color: "#065f46", bg: "#d1fae5",
    },
    {
      label: "Need attention",
      value: String(attentionAccounts.length),
      color: attentionAccounts.length > 0 ? "#92400e" : "#6b7280",
      bg:    attentionAccounts.length > 0 ? "#fef3c7" : "#f3f4f6",
    },
    {
      label: "Posts / month",
      value: String(accounts.reduce((s, a) => s + a.postsPublishedThisMonth, 0)),
      color: "#1e40af", bg: "#dbeafe",
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <StyleInjector />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Page header */}
        <div className="pp-page-header">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.025em", margin: "0 0 4px" }}>
              Connected accounts
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Manage LinkedIn, X, and Instagram accounts PostPilot can publish on your behalf.
            </p>
          </div>
          <button
            onClick={() => setShowPicker(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              height: 40, padding: "0 16px", borderRadius: 12, border: "none",
              background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <Plus style={{ width: 16, height: 16 }} aria-hidden="true" />
            Add account
          </button>
        </div>

        {/* Hard fetch error */}
        {fetchError && !loadingAccounts && (
          <div
            role="alert"
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 16,
              background: "#fef2f2", border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <AlertTriangle style={{ width: 18, height: 18, color: "#ef4444", flexShrink: 0 }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", margin: 0 }}>
                Could not load accounts
              </p>
              <p style={{ fontSize: 12, color: "#b91c1c", margin: "2px 0 0" }}>{fetchError}</p>
            </div>
            <button
              onClick={fetchAccounts}
              style={{
                fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
                background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Attention banner */}
        {!loadingAccounts && attentionAccounts.length > 0 && (
          <div
            role="alert"
            style={{
              display: "flex", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 16,
              background: "#fef3c7", border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <AlertTriangle style={{ width: 18, height: 18, color: "#d97706", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", margin: 0 }}>
                {attentionAccounts.length} account{attentionAccounts.length > 1 ? "s" : ""} need{attentionAccounts.length === 1 ? "s" : ""} attention
              </p>
              <p style={{ fontSize: 12, color: "#b45309", margin: "3px 0 0" }}>
                {attentionAccounts.map((a) => a.name).join(", ")} — expired tokens pause scheduled posts.
              </p>
            </div>
          </div>
        )}

        {/* Summary bar */}
        {(loadingAccounts || accounts.length > 0) && (
          <div
            className="pp-summary-grid"
            aria-label="Account summary"
            style={{
              border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {summaryStats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  background: "#fff", padding: "14px 0",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  borderRight: i < summaryStats.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none",
                }}
              >
                {loadingAccounts ? (
                  <div aria-hidden="true" style={{ width: 48, height: 28, borderRadius: 6, background: "#f3f4f6", animation: "pp-shimmer 1.4s infinite" }} />
                ) : (
                  <p aria-label={`${s.value} ${s.label}`} style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.03em", margin: 0 }}>
                    {s.value}
                  </p>
                )}
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color, textAlign: "center" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Platform columns */}
        <div className="pp-accounts-grid">
          {platforms.map((platform) => (
            <PlatformColumn
              key={platform}
              platform={platform}
              accounts={accounts.filter((a) => a.platform === platform)}
              loading={loadingAccounts}
              onAdd={(p) => setConnectPlatform(p)}
              onDelete={setDeleteTarget}
              onReconnect={handleReconnect}
            />
          ))}
        </div>

        {/* Coming soon */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: 10, margin: "0 0 10px" }}>
            More platforms coming soon
          </p>
          <div className="pp-coming-grid">
            {[
              { name: "Facebook", color: "#1877f2", bg: "#dbeafe", icon: "f" },
              { name: "TikTok",   color: "#010101", bg: "#f3f4f6", icon: "♪" },
              { name: "YouTube",  color: "#ff0000", bg: "#fee2e2", icon: "▶" },
            ].map((p) => (
              <div
                key={p.name}
                aria-label={`${p.name} — coming soon`}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)",
                  background: "#fff", opacity: 0.6, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 8, background: p.bg, color: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {p.icon}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: 0 }}>{p.name}</p>
                  <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>Coming soon</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showPicker && (
        <PlatformPickerModal
          onSelect={(p) => { setShowPicker(false); setConnectPlatform(p) }}
          onCancel={() => setShowPicker(false)}
        />
      )}
      {connectPlatform && (
        <ConnectPlatformModal
          platform={connectPlatform}
          loading={connecting}
          onConnect={handleConnect}
          onCancel={() => { if (!connecting) setConnectPlatform(null) }}
        />
      )}
      {deleteTarget && (
        <DisconnectModal
          account={deleteTarget}
          loading={deleting}
          onConfirm={handleDisconnectConfirm}
          onCancel={() => { if (!deleting) setDeleteTarget(null) }}
        />
      )}

      {/* ── Toast stack ─────────────────────────────────────────────────────── */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="false"
          aria-label="Notifications"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 60,
            display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end",
          }}
        >
          {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />)}
        </div>
      )}
    </>
  )
}