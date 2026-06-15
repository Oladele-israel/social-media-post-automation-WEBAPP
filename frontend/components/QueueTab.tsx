"use client"

import { useState } from "react"
import { Clock, MoreHorizontal, Plus, Search } from "lucide-react"
import { Card, PlatformIcon, StatusPill, EmptyState } from "@/components/uiPrimitives"

type Status = "scheduled" | "draft" | "live" | "failed"
type Platform = "instagram" | "linkedin" | "twitter"

interface QueuePost {
  id: number
  platform: Platform
  text: string
  time: string
  status: Status
  engagements?: string
  reach?: string
  tags: string[]
}

const ALL_POSTS: QueuePost[] = [
  { id: 1,  platform: "instagram", text: "Behind the scenes — how we built our onboarding flow with zero dev resources 🔧",            time: "Today, 2:00 PM",     status: "live",      engagements: "1.2k", reach: "18.4k", tags: ["BTS", "Product"] },
  { id: 2,  platform: "twitter",   text: "3 things our most-engaged posts have in common (thread) 🧵",                                 time: "Today, 5:30 PM",    status: "scheduled",                            tags: ["Thread", "Tips"] },
  { id: 3,  platform: "linkedin",  text: "Why most B2B content fails before it's even published — a breakdown",                        time: "Tomorrow, 9:00 AM", status: "draft",                                tags: ["B2B", "Strategy"] },
  { id: 4,  platform: "instagram", text: "Product update: introducing multi-account scheduling 🎉",                                   time: "Thu, 11:00 AM",     status: "scheduled",                            tags: ["Product", "Launch"] },
  { id: 5,  platform: "twitter",   text: "Poll: what type of content do you find most valuable?",                                     time: "Fri, 1:00 PM",      status: "scheduled",                            tags: ["Engagement"] },
  { id: 6,  platform: "linkedin",  text: "Case study: how one team grew LinkedIn engagement by 340% in 3 months",                     time: "Jun 15, 3:00 PM",   status: "scheduled",                            tags: ["Case Study"] },
  { id: 7,  platform: "instagram", text: "5-slide carousel: the content framework we use to hit 7% engagement every time 📊",         time: "Jun 17, 6:00 PM",   status: "draft",                                tags: ["Carousel", "Framework"] },
  { id: 8,  platform: "twitter",   text: "Hot take: scheduled posting is overrated if you haven't nailed your content strategy first", time: "Jun 8, 12:00 PM",   status: "live",      engagements: "874",  reach: "12.1k", tags: ["Opinion"] },
  { id: 9,  platform: "instagram", text: "User spotlight: @designstudio shares how they save 8 hours a week with automation",         time: "Jun 7, 10:00 AM",   status: "live",      engagements: "2.1k", reach: "31.8k", tags: ["Social proof"] },
  { id: 10, platform: "linkedin",  text: "The future of content marketing is automation + authenticity — here's why",                 time: "Jun 20, 9:00 AM",   status: "draft",                                tags: ["Thought leadership"] },
]

const FILTERS: { label: string; value: Status | "all" }[] = [
  { label: "All",       value: "all"       },
  { label: "Scheduled", value: "scheduled" },
  { label: "Drafts",    value: "draft"     },
  { label: "Published", value: "live"      },
  { label: "Failed",    value: "failed"    },
]

export function QueueTab() {
  const [activeFilter, setActiveFilter] = useState<Status | "all">("all")
  const [searchQuery, setSearchQuery]   = useState("")

  const filtered = ALL_POSTS.filter((p) => {
    const matchesFilter = activeFilter === "all" || p.status === activeFilter
    const matchesSearch =
      p.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const counts: Record<string, number> = {
    all:       ALL_POSTS.length,
    scheduled: ALL_POSTS.filter((p) => p.status === "scheduled").length,
    draft:     ALL_POSTS.filter((p) => p.status === "draft").length,
    live:      ALL_POSTS.filter((p) => p.status === "live").length,
    failed:    ALL_POSTS.filter((p) => p.status === "failed").length,
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">

        {/* Status filters */}
        <div
          className="flex items-center gap-[2px] rounded-2xl p-[3px]"
          style={{
            background: "#f0f2f7",
            border: "1px solid rgba(0,0,0,0.07)",
          }}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className="flex items-center gap-[6px] px-3 py-[6px] rounded-xl text-[11px] font-semibold transition-all duration-150"
                style={{
                  background: isActive ? "#ffffff" : "transparent",
                  color:      isActive ? "#111827" : "#9ca3af",
                  boxShadow:  isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {f.label}
                <span
                  className="text-[9px] px-[6px] py-[2px] rounded-full font-bold"
                  style={{
                    background: isActive ? "#e6f5ee" : "#e8ebf2",
                    color:      isActive ? "#1a5c3a" : "#9ca3af",
                  }}
                >
                  {counts[f.value]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative md:ml-auto">
          <Search
            className="absolute left-[10px] top-1/2 -translate-y-1/2 w-[13px] h-[13px] pointer-events-none"
            style={{ color: "#9ca3af" }}
          />
          <input
            type="text"
            placeholder="Search posts or tags…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-60 h-9 rounded-xl pl-8 pr-3 text-[12px] focus:w-72 transition-all duration-200"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.1)",
              color: "#374151",
            }}
          />
        </div>

        <button
          className="flex items-center gap-[5px] h-9 px-4 rounded-xl text-white text-[12px] font-semibold transition-all duration-150"
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
          New post
        </button>
      </div>

      {/* ── Posts list ────────────────────────────────────────────────────── */}
      <Card noPad className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="w-5 h-5" />}
            title="No posts match your search"
            description="Try a different filter or search term"
          />
        ) : (
          <div>
            {filtered.map((post, idx) => (
              <div
                key={post.id}
                className="flex items-start gap-4 px-5 py-4 group transition-colors duration-100 cursor-pointer"
                style={{
                  borderBottom: idx < filtered.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.background = "#f5f6fa"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.background = "transparent"
                }}
              >
                <PlatformIcon platform={post.platform} />

                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] leading-relaxed line-clamp-2 font-medium"
                    style={{ color: "#374151" }}
                  >
                    {post.text}
                  </p>
                  <div className="flex items-center gap-[8px] mt-[7px] flex-wrap">
                    <span
                      className="flex items-center gap-1 text-[10px] font-medium"
                      style={{ color: "#9ca3af" }}
                    >
                      <Clock className="w-3 h-3" />
                      {post.time}
                    </span>
                    <StatusPill status={post.status} />
                    {post.tags.map((tag) => (
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
                </div>

                {/* Live stats */}
                {post.status === "live" && post.engagements && (
                  <div className="hidden md:flex items-center gap-6 text-right flex-shrink-0">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wide mb-[3px]" style={{ color: "#9ca3af" }}>
                        Engagements
                      </p>
                      <p className="text-[14px] font-bold" style={{ color: "#065f46" }}>
                        {post.engagements}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wide mb-[3px]" style={{ color: "#9ca3af" }}>
                        Reach
                      </p>
                      <p className="text-[14px] font-bold" style={{ color: "#111827" }}>
                        {post.reach}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
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
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}