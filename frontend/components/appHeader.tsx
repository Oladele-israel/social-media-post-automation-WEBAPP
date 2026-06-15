"use client"

import { useState } from "react"
import { Bell, Menu, PanelLeft, Plus, Search, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  notifications: number
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenMobileMenu: () => void
  activeTab?: string
}

const PAGE_META: Record<string, { title: string; sub: string }> = {
  analytics:   { title: "Analytics overview",  sub: "Your content performance at a glance" },
  schedule:    { title: "Post schedule",        sub: "Plan and manage your publishing calendar" },
  queue:       { title: "Content queue",        sub: "Drafts, scheduled & recently published" },
  campaigns:   { title: "Campaigns",            sub: "Track multi-post campaign performance" },
  "ai-writer": { title: "AI writer",            sub: "Generate on-brand content in seconds" },
}

export function AppHeader({
  notifications,
  sidebarOpen,
  onToggleSidebar,
  onOpenMobileMenu,
  activeTab = "analytics",
}: AppHeaderProps) {
  const [search, setSearch] = useState("")
  const meta = PAGE_META[activeTab] ?? PAGE_META.analytics

  return (
    <header
      className="h-14 flex-shrink-0 flex items-center px-4 md:px-5 gap-3 sticky top-0 z-20"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* ── Sidebar toggle — desktop ──────────────────────────────────────── */}
      <button
        onClick={onToggleSidebar}
        className={cn(
          "hidden md:flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0",
          "transition-all duration-150"
        )}
        style={{ color: "#9ca3af", background: "transparent" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = "#f5f6fa"
          el.style.color = "#374151"
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = "transparent"
          el.style.color = "#9ca3af"
        }}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <PanelLeft className="w-[15px] h-[15px]" />
      </button>

      {/* ── Hamburger — mobile ────────────────────────────────────────────── */}
      <button
        onClick={onOpenMobileMenu}
        className="flex md:hidden items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 flex-shrink-0"
        style={{ color: "#9ca3af" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = "#f5f6fa"
          el.style.color = "#374151"
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = "transparent"
          el.style.color = "#9ca3af"
        }}
        aria-label="Open menu"
      >
        <Menu className="w-[15px] h-[15px]" />
      </button>

      {/* Divider */}
      <div
        className="hidden md:block w-px h-[18px] flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.08)" }}
      />

      {/* ── Brand / page title ────────────────────────────────────────────── */}
      {sidebarOpen ? (
        <div className="hidden md:flex flex-col gap-[2px]">
          <p
            className="text-[14px] font-semibold leading-none"
            style={{ color: "#111827", letterSpacing: "-0.015em" }}
          >
            {meta.title}
          </p>
          <p className="text-[11px] leading-none" style={{ color: "#9ca3af" }}>
            {meta.sub}
          </p>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-[7px] flex-shrink-0">
          <div
            className="w-[24px] h-[24px] rounded-lg flex items-center justify-center"
            style={{ background: "#1a5c3a" }}
          >
            <Zap className="w-[12px] h-[12px] text-white fill-white stroke-none" />
          </div>
          <span
            className="text-[14px] font-bold"
            style={{ color: "#111827", letterSpacing: "-0.02em" }}
          >
            Post<span style={{ color: "#1a5c3a" }}>Pilot</span>
          </span>
        </div>
      )}

      {/* ── Right cluster ─────────────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-2">

        {/* Search — desktop */}
        <div className="relative hidden md:flex items-center">
          <Search
            className="absolute left-[10px] w-[13px] h-[13px] pointer-events-none"
            style={{ color: "#9ca3af" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts, campaigns…"
            className="w-[200px] h-[32px] rounded-xl pl-[30px] pr-3 text-[12px] transition-all duration-200 focus:w-[240px]"
            style={{
              background: "#f5f6fa",
              border: "1px solid rgba(0,0,0,0.08)",
              color: "#374151",
            }}
          />
        </div>

        {/* Search icon — mobile */}
        <button
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
          style={{ color: "#9ca3af" }}
          aria-label="Search"
        >
          <Search className="w-[15px] h-[15px]" />
        </button>

        {/* Trial badge */}
        <div
          className="hidden lg:flex items-center gap-[5px] px-[10px] py-[4px] rounded-full cursor-pointer select-none whitespace-nowrap transition-colors duration-150"
          style={{
            background: "#fef3c7",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLDivElement).style.background = "#fde68a"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLDivElement).style.background = "#fef3c7"
          }}
        >
          <Zap
            className="w-[10px] h-[10px]"
            style={{ color: "#d97706", fill: "#d97706", stroke: "none" }}
          />
          <span className="text-[10px] font-semibold" style={{ color: "#92400e" }}>
            Free trial · 7 days left
          </span>
        </div>

        {/* Notifications */}
        <button
          className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
          style={{ color: "#9ca3af", background: "transparent" }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = "#f5f6fa"
            el.style.color = "#374151"
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = "transparent"
            el.style.color = "#9ca3af"
          }}
          aria-label={
            notifications > 0
              ? `${notifications} unread notification${notifications > 1 ? "s" : ""}`
              : "Notifications"
          }
        >
          <Bell className="w-[15px] h-[15px]" />
          {notifications > 0 && (
            notifications === 1 ? (
              <span
                className="absolute top-[6px] right-[6px] w-[7px] h-[7px] rounded-full"
                style={{
                  background: "#ef4444",
                  border: "1.5px solid #ffffff",
                }}
              />
            ) : (
              <span
                className="absolute top-[3px] right-[3px] min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[8px] font-bold px-[3px] leading-none"
                style={{
                  background: "#ef4444",
                  border: "1.5px solid #ffffff",
                  color: "#fff",
                }}
              >
                {notifications > 9 ? "9+" : notifications}
              </span>
            )
          )}
        </button>

        {/* Avatar */}
        <button
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-bold tracking-wide flex-shrink-0 transition-all duration-150"
          style={{
            background: "#1a5c3a",
            color: "#ffffff",
            boxShadow: "0 2px 6px rgba(26,92,58,0.35)",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "0 3px 10px rgba(26,92,58,0.5)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 6px rgba(26,92,58,0.35)"
          }}
          aria-label="Account menu"
          title="Jake Adeyemi"
        >
          JA
        </button>

        {/* New post — desktop */}
        <Button
          size="sm"
          className="hidden md:flex rounded-xl text-white text-[12px] font-semibold h-[32px] px-4 gap-[5px] transition-all duration-150"
          style={{
            background: "#1a5c3a",
            boxShadow: "0 2px 8px rgba(26,92,58,0.3)",
            border: "none",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "#237a4e"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "#1a5c3a"
          }}
        >
          <Plus className="w-[12px] h-[12px]" />
          New post
        </Button>

        {/* New post — mobile icon */}
        <button
          className="flex md:hidden items-center justify-center w-8 h-8 rounded-xl transition-colors flex-shrink-0"
          style={{ background: "#1a5c3a" }}
          aria-label="New post"
        >
          <Plus className="w-[15px] h-[15px] text-white" />
        </button>
      </div>
    </header>
  )
}