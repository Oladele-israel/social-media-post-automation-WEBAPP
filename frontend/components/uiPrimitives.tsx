"use client"

// Shared sub-components — PostPilot light theme (Donezo-inspired)
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  trend: "up" | "down" | "neutral"
  trendLabel: string
  accent: "purple" | "teal" | "amber" | "coral"
  sparkPoints?: string
}

const ACCENT = {
  purple: { bar: "#1a5c3a", spark: "#1a5c3a", bg: "#e6f5ee", text: "#1a5c3a",  badge: "rgba(26,92,58,0.1)" },
  teal:   { bar: "#2ecc8f", spark: "#2ecc8f", bg: "#d1fae5", text: "#065f46",  badge: "rgba(46,204,143,0.12)" },
  amber:  { bar: "#f59e0b", spark: "#f59e0b", bg: "#fef3c7", text: "#92400e",  badge: "rgba(245,158,11,0.12)" },
  coral:  { bar: "#ef4444", spark: "#ef4444", bg: "#fee2e2", text: "#991b1b",  badge: "rgba(239,68,68,0.10)" },
}

export function KpiCard({ label, value, trend, trendLabel, accent, sparkPoints }: KpiCardProps) {
  const a = ACCENT[accent]

  return (
    <div
      className="relative overflow-hidden rounded-2xl border px-5 py-4 transition-shadow duration-150 hover:shadow-md"
      style={{
        background: "#ffffff",
        borderColor: "rgba(0,0,0,0.07)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{ background: a.bar }}
      />

      {/* Corner accent dot */}
      <div
        className="absolute top-4 right-4 w-9 h-9 rounded-full opacity-60 pointer-events-none"
        style={{ background: a.bg }}
      />

      <p
        className="text-[11px] font-semibold uppercase tracking-[0.7px] mb-[10px]"
        style={{ color: "#6b7280" }}
      >
        {label}
      </p>

      <p
        className="text-[30px] font-bold tracking-[-0.03em] leading-none mb-3"
        style={{ color: "#111827" }}
      >
        {value}
      </p>

      <div className="flex items-center gap-[5px] text-[11px]">
        {trend === "up" && (
          <span
            className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold"
            style={{ background: "rgba(46,204,143,0.12)", color: "#065f46" }}
          >
            <TrendingUp className="w-3 h-3" />
            {trendLabel}
          </span>
        )}
        {trend === "down" && (
          <span
            className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold"
            style={{ background: "rgba(239,68,68,0.10)", color: "#991b1b" }}
          >
            <TrendingDown className="w-3 h-3" />
            {trendLabel}
          </span>
        )}
        {trend === "neutral" && (
          <span
            className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold"
            style={{ background: "rgba(0,0,0,0.05)", color: "#6b7280" }}
          >
            <Minus className="w-3 h-3" />
            {trendLabel}
          </span>
        )}
      </div>

      {/* Sparkline */}
      {sparkPoints && (
        <svg
          className="absolute bottom-4 right-4"
          width="60"
          height="24"
          aria-hidden="true"
          style={{ opacity: 0.35 }}
        >
          <polyline
            points={sparkPoints}
            fill="none"
            stroke={a.spark}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

export function Card({
  className,
  children,
  noPad = false,
}: {
  className?: string
  children: React.ReactNode
  noPad?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-shadow duration-150",
        noPad ? "" : "p-5",
        className
      )}
      style={{
        background: "#ffffff",
        borderColor: "rgba(0,0,0,0.07)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      {children}
    </div>
  )
}

// ─── Card header ─────────────────────────────────────────────────────────────

export function CardHeader({
  title,
  sub,
  children,
}: {
  title: string
  sub?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start mb-5">
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-semibold"
          style={{ color: "#111827", letterSpacing: "-0.01em" }}
        >
          {title}
        </p>
        {sub && (
          <p className="text-[12px] mt-[3px]" style={{ color: "#6b7280" }}>
            {sub}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">{children}</div>
      )}
    </div>
  )
}

// ─── Icon button ─────────────────────────────────────────────────────────────

export function IconButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "w-8 h-8 rounded-xl border flex items-center justify-center",
        "transition-all duration-150",
        className
      )}
      style={{
        background: "#f5f6fa",
        borderColor: "rgba(0,0,0,0.08)",
        color: "#6b7280",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = "#e6f5ee"
        el.style.borderColor = "rgba(26,92,58,0.2)"
        el.style.color = "#1a5c3a"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = "#f5f6fa"
        el.style.borderColor = "rgba(0,0,0,0.08)"
        el.style.color = "#6b7280"
      }}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Platform badge ───────────────────────────────────────────────────────────

type Platform = "instagram" | "linkedin" | "twitter"

const PLATFORM_STYLES: Record<Platform, {
  bg: string; color: string; icon: string; label: string
}> = {
  instagram: { bg: "#fee2e2", color: "#be185d", icon: "IG", label: "Instagram" },
  linkedin:  { bg: "#dbeafe", color: "#1d4ed8", icon: "in", label: "LinkedIn"  },
  twitter:   { bg: "#e0f2fe", color: "#0369a1", icon: "𝕏",  label: "Twitter/X" },
}

export function PlatformIcon({ platform, size = "md" }: { platform: Platform; size?: "sm" | "md" }) {
  const s = PLATFORM_STYLES[platform]
  const dim = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-[11px]"
  return (
    <div
      className={cn("rounded-xl flex items-center justify-center font-bold flex-shrink-0", dim)}
      style={{ background: s.bg, color: s.color }}
      title={s.label}
    >
      {s.icon}
    </div>
  )
}

// ─── Status pill ─────────────────────────────────────────────────────────────

type Status = "scheduled" | "draft" | "live" | "failed"

const STATUS_CFG: Record<Status, { bg: string; color: string; dot: string }> = {
  scheduled: { bg: "#e6f5ee",  color: "#1a5c3a", dot: "#2ecc8f" },
  draft:     { bg: "#f3f4f6",  color: "#374151", dot: "#9ca3af" },
  live:      { bg: "#d1fae5",  color: "#065f46", dot: "#10b981" },
  failed:    { bg: "#fee2e2",  color: "#991b1b", dot: "#ef4444" },
}

export function StatusPill({ status }: { status: Status }) {
  const c = STATUS_CFG[status]
  return (
    <span
      className="inline-flex items-center gap-[5px] text-[10px] font-semibold px-[9px] py-[3px] rounded-full capitalize"
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full flex-shrink-0"
        style={{ background: c.dot }}
      />
      {status}
    </span>
  )
}

// ─── Section divider ─────────────────────────────────────────────────────────

export function SectionDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-px my-4", className)}
      style={{ background: "rgba(0,0,0,0.06)" }}
    />
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: "#e6f5ee" }}
      >
        <span style={{ color: "#1a5c3a" }}>{icon}</span>
      </div>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: "#374151" }}>
          {title}
        </p>
        {description && (
          <p className="text-[12px] mt-1" style={{ color: "#9ca3af" }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

// ─── AI suggestion block ─────────────────────────────────────────────────────

export function AiSuggestion({
  icon,
  children,
  variant = "purple",
}: {
  icon: React.ReactNode
  children: React.ReactNode
  variant?: "purple" | "amber"
}) {
  const cfg =
    variant === "purple"
      ? { bg: "#e6f5ee", border: "rgba(26,92,58,0.18)", iconBg: "#1a5c3a" }
      : { bg: "#fef3c7", border: "rgba(245,158,11,0.25)", iconBg: "#f59e0b" }

  return (
    <div
      className="rounded-xl p-[14px] flex gap-[10px] items-start border"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <div
        className="w-[30px] h-[30px] rounded-xl flex items-center justify-center flex-shrink-0 mt-[1px]"
        style={{ background: cfg.iconBg }}
      >
        <span style={{ color: "#fff", display: "flex" }}>{icon}</span>
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: "#374151" }}>
        {children}
      </p>
    </div>
  )
}

// ─── Ghost button ─────────────────────────────────────────────────────────────

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "w-full flex items-center justify-center gap-[6px]",
        "text-[12px] font-medium py-[9px] rounded-xl border",
        "transition-all duration-150",
        className
      )}
      style={{
        color: "#1a5c3a",
        borderColor: "rgba(26,92,58,0.25)",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = "#e6f5ee"
        el.style.borderColor = "rgba(26,92,58,0.4)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = "transparent"
        el.style.borderColor = "rgba(26,92,58,0.25)"
      }}
      {...props}
    >
      {children}
    </button>
  )
}