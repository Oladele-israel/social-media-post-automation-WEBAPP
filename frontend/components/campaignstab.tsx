"use client"

import { useState } from "react"
import { Plus, MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardHeader, PlatformIcon, EmptyState } from "@/components/uiPrimitives"

type CampaignStatus = "active" | "paused" | "completed" | "draft"

interface Campaign {
  id: number
  name: string
  platforms: ("instagram" | "linkedin" | "twitter")[]
  status: CampaignStatus
  posts: number
  postsPublished: number
  reach: string
  engagementRate: string
  trend: "up" | "down" | "neutral"
  trendValue: string
  startDate: string
  endDate: string
  tags: string[]
}

const CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    name: "Product launch — Scheduling v2",
    platforms: ["instagram", "twitter", "linkedin"],
    status: "active",
    posts: 12, postsPublished: 7,
    reach: "84.2k", engagementRate: "6.8%",
    trend: "up", trendValue: "+2.1%",
    startDate: "Jun 1", endDate: "Jun 30",
    tags: ["Product", "Launch"],
  },
  {
    id: 2,
    name: "Thought leadership series — Q2",
    platforms: ["linkedin", "twitter"],
    status: "active",
    posts: 8, postsPublished: 5,
    reach: "42.1k", engagementRate: "5.3%",
    trend: "up", trendValue: "+0.8%",
    startDate: "May 15", endDate: "Jun 30",
    tags: ["B2B", "Thought leadership"],
  },
  {
    id: 3,
    name: "User spotlight campaign",
    platforms: ["instagram"],
    status: "completed",
    posts: 6, postsPublished: 6,
    reach: "61.4k", engagementRate: "8.2%",
    trend: "neutral", trendValue: "+0.0%",
    startDate: "May 1", endDate: "May 31",
    tags: ["Social proof", "Community"],
  },
  {
    id: 4,
    name: "Summer engagement push",
    platforms: ["instagram", "twitter"],
    status: "draft",
    posts: 10, postsPublished: 0,
    reach: "—", engagementRate: "—",
    trend: "neutral", trendValue: "—",
    startDate: "Jul 1", endDate: "Jul 31",
    tags: ["Seasonal"],
  },
  {
    id: 5,
    name: "LinkedIn authority building",
    platforms: ["linkedin"],
    status: "paused",
    posts: 15, postsPublished: 9,
    reach: "29.6k", engagementRate: "4.1%",
    trend: "down", trendValue: "−1.2%",
    startDate: "Apr 1", endDate: "Jun 30",
    tags: ["B2B", "LinkedIn"],
  },
]

const STATUS_CFG: Record<CampaignStatus, { bg: string; color: string; dot: string }> = {
  active:    { bg: "#d1fae5",  color: "#065f46", dot: "#10b981" },
  paused:    { bg: "#fef3c7",  color: "#92400e", dot: "#f59e0b" },
  completed: { bg: "#f3f4f6",  color: "#374151", dot: "#9ca3af" },
  draft:     { bg: "#f0f2f7",  color: "#6b7280", dot: "#d1d5db" },
}

const FILTER_OPTIONS: { label: string; value: CampaignStatus | "all" }[] = [
  { label: "All",       value: "all"       },
  { label: "Active",    value: "active"    },
  { label: "Paused",    value: "paused"    },
  { label: "Completed", value: "completed" },
  { label: "Drafts",    value: "draft"     },
]

export function CampaignsTab() {
  const [activeFilter, setActiveFilter] = useState<CampaignStatus | "all">("all")

  const filtered = CAMPAIGNS.filter(
    (c) => activeFilter === "all" || c.status === activeFilter
  )

  return (
    <div className="flex flex-col gap-5">

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-[2px] rounded-2xl p-[3px]"
          style={{
            background: "#f0f2f7",
            border: "1px solid rgba(0,0,0,0.07)",
          }}
        >
          {FILTER_OPTIONS.map((f) => {
            const isActive = activeFilter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className="px-3 py-[6px] rounded-xl text-[11px] font-semibold transition-all duration-150"
                style={{
                  background: isActive ? "#ffffff" : "transparent",
                  color:      isActive ? "#111827" : "#9ca3af",
                  boxShadow:  isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <button
          className="ml-auto flex items-center gap-[5px] h-9 px-4 rounded-xl text-white text-[12px] font-semibold transition-all duration-150"
          style={{
            background: "#1a5c3a",
            boxShadow: "0 2px 8px rgba(26,92,58,0.25)",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "#237a4e"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "#1a5c3a"
          }}
        >
          <Plus className="w-[13px] h-[13px]" />
          New campaign
        </button>
      </div>

      {/* ── Campaign cards ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-5 h-5" />}
          title="No campaigns here"
          description="Create your first campaign to get started"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((campaign) => {
            const s = STATUS_CFG[campaign.status]
            const progressPct = campaign.posts > 0
              ? Math.round((campaign.postsPublished / campaign.posts) * 100)
              : 0

            return (
              <Card
                key={campaign.id}
                className="cursor-pointer transition-all duration-150"
                style={{
                  border: "1px solid rgba(0,0,0,0.07)",
                }}
              >
                <div
                  onMouseEnter={(e) => {
                    ;(e.currentTarget.closest("[data-card]") as HTMLDivElement | null)
                    const card = e.currentTarget.closest(".rounded-2xl") as HTMLDivElement | null
                    if (card) {
                      card.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"
                      card.style.borderColor = "rgba(26,92,58,0.2)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget.closest(".rounded-2xl") as HTMLDivElement | null
                    if (card) {
                      card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"
                      card.style.borderColor = "rgba(0,0,0,0.07)"
                    }
                  }}
                  className="flex items-start gap-4"
                >
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-[6px] flex-wrap">
                      <h3
                        className="text-[14px] font-semibold"
                        style={{ color: "#111827", letterSpacing: "-0.01em" }}
                      >
                        {campaign.name}
                      </h3>
                      <span
                        className="text-[10px] font-bold px-[9px] py-[3px] rounded-full flex items-center gap-[5px]"
                        style={{ background: s.bg, color: s.color }}
                      >
                        <span
                          className="w-[5px] h-[5px] rounded-full"
                          style={{ background: s.dot }}
                        />
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </div>

                    {/* Platforms + date + tags */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <div className="flex -space-x-[5px]">
                        {campaign.platforms.map((p) => (
                          <PlatformIcon key={p} platform={p} size="sm" />
                        ))}
                      </div>
                      <span className="text-[11px] font-medium" style={{ color: "#9ca3af" }}>
                        {campaign.startDate} — {campaign.endDate}
                      </span>
                      {campaign.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-semibold px-[8px] py-[2px] rounded-full"
                          style={{
                            background: "#f0f2f7",
                            color: "#6b7280",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Progress */}
                    <div className="mb-[5px] flex items-center justify-between">
                      <span className="text-[11px] font-medium" style={{ color: "#6b7280" }}>
                        {campaign.postsPublished} / {campaign.posts} posts published
                      </span>
                      <span className="text-[11px] font-bold" style={{ color: "#374151" }}>
                        {progressPct}%
                      </span>
                    </div>
                    <div
                      className="h-[5px] rounded-full overflow-hidden"
                      style={{ background: "#f0f2f7" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPct}%`,
                          background: campaign.status === "completed" ? "#10b981" : "#1a5c3a",
                        }}
                      />
                    </div>
                  </div>

                  {/* Right: stats */}
                  <div className="hidden md:flex items-center gap-8 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-wide mb-[4px]" style={{ color: "#9ca3af" }}>
                        Reach
                      </p>
                      <p
                        className="text-[18px] font-bold"
                        style={{ color: "#111827", letterSpacing: "-0.02em" }}
                      >
                        {campaign.reach}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-wide mb-[4px]" style={{ color: "#9ca3af" }}>
                        Engagement
                      </p>
                      <div className="flex items-center justify-end gap-[5px]">
                        <p
                          className="text-[18px] font-bold"
                          style={{ color: "#111827", letterSpacing: "-0.02em" }}
                        >
                          {campaign.engagementRate}
                        </p>
                        {campaign.trend === "up"   && <TrendingUp   className="w-[13px] h-[13px]" style={{ color: "#10b981" }} />}
                        {campaign.trend === "down" && <TrendingDown  className="w-[13px] h-[13px]" style={{ color: "#ef4444" }} />}
                      </div>
                      {campaign.trendValue !== "—" && (
                        <p
                          className="text-[10px] font-semibold mt-[1px]"
                          style={{
                            color: campaign.trend === "up"
                              ? "#10b981"
                              : campaign.trend === "down"
                              ? "#ef4444"
                              : "#9ca3af",
                          }}
                        >
                          {campaign.trendValue}
                        </p>
                      )}
                    </div>
                    <button
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-150"
                      style={{
                        color: "#9ca3af",
                        background: "#f0f2f7",
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = "#e8ebf2"
                        ;(e.currentTarget as HTMLButtonElement).style.color = "#374151"
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = "#f0f2f7"
                        ;(e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"
                      }}
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}