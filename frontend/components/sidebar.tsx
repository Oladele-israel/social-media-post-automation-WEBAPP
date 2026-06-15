"use client"

import { cn } from "@/lib/utils"
import {
  BarChart2, Calendar, LayoutGrid,
  Users, Link2, FileText, Settings, HelpCircle,
  SendHorizonal, ChevronRight, X, Wand2, AlertTriangle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  open: boolean
  activeTab?: string
  onTabChange?: (tab: string) => void
}

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

// ─── Nav data ─────────────────────────────────────────────────────────────────

const primaryNav = [
  { id: "analytics", label: "Analytics",     icon: BarChart2 },
  { id: "schedule",  label: "Schedule",      icon: Calendar,  badge: "3" },
  { id: "queue",     label: "Content queue", icon: FileText },
  { id: "ai-writer", label: "AI writer",     icon: Wand2 },
]

const manageNav = [
  { id: "campaigns", label: "Campaigns",  icon: LayoutGrid },
  { id: "audience",  label: "Audience",   icon: Users },
  {
    id: "accounts", label: "AccountsTab", icon: Link2,
    badge: "!", badgeAlert: true,
    badgeTip: "Reconnect Instagram",
  },
  { id: "reports", label: "Reports", icon: FileText },
]

const settingsNav = [
  { id: "settings", label: "Preferences", icon: Settings },
  { id: "help",     label: "Help & docs",  icon: HelpCircle },
]

// ─── Inner content ────────────────────────────────────────────────────────────

function SidebarContent({
  activeTab,
  onTabChange,
}: {
  activeTab?: string
  onTabChange?: (tab: string) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-[10px] px-3 pt-1 pb-6">
        <div
          className="w-[32px] h-[32px] rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#1a5c3a" }}
        >
          <SendHorizonal className="w-[14px] h-[14px] text-white" />
        </div>
        <span
          className="font-bold text-[15px]"
          style={{ color: "#111827", letterSpacing: "-0.025em" }}
        >
          Post<span style={{ color: "#1a5c3a" }}>Pilot</span>
        </span>
      </div>

      {/* Nav sections */}
      <NavSection
        label="Overview"
        items={primaryNav}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <NavSection
        label="Manage"
        items={manageNav}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <NavSection
        label="Settings"
        items={settingsNav}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      <div className="flex-1" />

      {/* Usage meter */}
      <div
        className="mx-2 mb-3 p-4 rounded-2xl"
        style={{
          background: "#e6f5ee",
          border: "1px solid rgba(26,92,58,0.15)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold" style={{ color: "#1a5c3a" }}>
            Posts this month
          </p>
          <p className="text-[12px] font-bold" style={{ color: "#1a5c3a" }}>
            47 / 100
          </p>
        </div>
        <div
          className="h-[5px] rounded-full overflow-hidden"
          style={{ background: "rgba(26,92,58,0.15)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: "47%", background: "#1a5c3a" }}
          />
        </div>
        <p className="text-[11px] mt-2" style={{ color: "#6b7280" }}>
          Free trial · 7 days remaining
        </p>
      </div>

      {/* Footer — user */}
      <div
        className="border-t pt-3 pb-1 px-1"
        style={{ borderColor: "rgba(0,0,0,0.07)" }}
      >
        <button
          className="w-full flex items-center gap-[10px] px-2 py-[9px] rounded-xl transition-colors duration-150 group"
          style={{ background: "transparent" }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "#f5f6fa"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
          }}
        >
          <div
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-bold tracking-wide flex-shrink-0"
            style={{
              background: "#1a5c3a",
              color: "#ffffff",
            }}
          >
            JA
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p
              className="text-[13px] font-semibold truncate"
              style={{ color: "#111827", letterSpacing: "-0.01em" }}
            >
              Jake Adeyemi
            </p>
            <p className="text-[11px]" style={{ color: "#9ca3af" }}>
              Admin · Free trial
            </p>
          </div>
          <ChevronRight
            className="w-3 h-3 flex-shrink-0 transition-colors duration-150"
            style={{ color: "#9ca3af" }}
          />
        </button>
      </div>
    </div>
  )
}

// ─── Nav section ─────────────────────────────────────────────────────────────

function NavSection({
  label,
  items,
  activeTab,
  onTabChange,
}: {
  label: string
  items: (typeof primaryNav[number] & { badgeAlert?: boolean; badgeTip?: string })[]
  activeTab?: string
  onTabChange?: (tab: string) => void
}) {
  return (
    <div className="mb-1">
      <p
        className="text-[10px] font-bold uppercase tracking-[0.9px] px-3 py-2 pt-4 mb-[2px]"
        style={{ color: "#9ca3af" }}
      >
        {label}
      </p>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => onTabChange?.(item.id)}
            className={cn(
              "w-full flex items-center gap-[9px] px-3 py-[8px] rounded-xl text-[13px] font-medium transition-all duration-150 mb-[1px]"
            )}
            style={{
              background: isActive ? "#e6f5ee" : "transparent",
              color: isActive ? "#1a5c3a" : "#6b7280",
              borderLeft: isActive ? "3px solid #1a5c3a" : "3px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = "#f5f6fa"
                el.style.color = "#374151"
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = "transparent"
                el.style.color = "#6b7280"
              }
            }}
          >
            <Icon
              className="w-[16px] h-[16px] flex-shrink-0"
              style={{ color: isActive ? "#1a5c3a" : "currentColor" }}
            />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              (item as any).badgeAlert ? (
                <span
                  className="flex items-center gap-[3px] text-[9px] font-bold px-[7px] py-[2px] rounded-full"
                  style={{
                    background: "#fef3c7",
                    color: "#92400e",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                  title={(item as any).badgeTip}
                >
                  <AlertTriangle className="w-[9px] h-[9px]" />
                  Fix
                </span>
              ) : (
                <span
                  className="text-[9px] font-bold px-[7px] py-[2px] rounded-full"
                  style={{
                    background: "#e6f5ee",
                    color: "#1a5c3a",
                  }}
                >
                  {item.badge}
                </span>
              )
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function DesktopSidebar({ open, activeTab, onTabChange }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden md:flex fixed top-0 left-0 h-full w-64 flex-col px-3 py-5 z-30",
        "transition-transform duration-[280ms]",
        open ? "translate-x-0" : "-translate-x-full"
      )}
      style={{
        background: "#ffffff",
        borderRight: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "2px 0 16px rgba(0,0,0,0.04)",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <SidebarContent activeTab={activeTab} onTabChange={onTabChange} />
    </aside>
  )
}

// ─── Mobile sidebar ───────────────────────────────────────────────────────────

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[260px] flex flex-col px-3 py-5 z-50 md:hidden",
          "transition-transform duration-[280ms]",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "#ffffff",
          borderRight: "1px solid rgba(0,0,0,0.07)",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-[6px] rounded-xl transition-colors"
          style={{ background: "#f5f6fa", color: "#6b7280" }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"
            ;(e.currentTarget as HTMLButtonElement).style.color = "#ef4444"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "#f5f6fa"
            ;(e.currentTarget as HTMLButtonElement).style.color = "#6b7280"
          }}
          aria-label="Close menu"
        >
          <X className="w-[14px] h-[14px]" />
        </button>
        <SidebarContent />
      </aside>
    </>
  )
}