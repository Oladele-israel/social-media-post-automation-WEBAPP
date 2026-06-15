"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Card, CardHeader, PlatformIcon, StatusPill, IconButton, EmptyState } from "@/components/uiPrimitives"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const SCHEDULED_POSTS: Record<
  number,
  { platform: "instagram" | "linkedin" | "twitter"; text: string; time: string; status: "scheduled" | "draft" | "live" }[]
> = {
  10: [
    { platform: "instagram", text: "Behind the scenes reel",  time: "2:00 PM",  status: "live"      },
    { platform: "twitter",   text: "Engagement thread 🧵",    time: "5:30 PM",  status: "live"      },
  ],
  11: [{ platform: "linkedin",  text: "B2B content breakdown",  time: "9:00 AM",  status: "scheduled" }],
  13: [
    { platform: "instagram", text: "Product update post",      time: "11:00 AM", status: "scheduled" },
    { platform: "twitter",   text: "Announcement thread",      time: "2:00 PM",  status: "scheduled" },
  ],
  15: [
    { platform: "linkedin",  text: "Industry insights",        time: "8:30 AM",  status: "scheduled" },
    { platform: "instagram", text: "Carousel: 5 tips",         time: "6:00 PM",  status: "draft"     },
  ],
  17: [{ platform: "twitter",   text: "Weekly roundup",          time: "12:00 PM", status: "scheduled" }],
  20: [
    { platform: "instagram", text: "User spotlight",            time: "10:00 AM", status: "draft"     },
    { platform: "linkedin",  text: "Case study launch",         time: "3:00 PM",  status: "scheduled" },
  ],
  22: [{ platform: "twitter",   text: "Poll: best practices",    time: "1:00 PM",  status: "scheduled" }],
  25: [
    { platform: "instagram", text: "Behind-the-scenes",         time: "4:00 PM",  status: "draft"     },
    { platform: "linkedin",  text: "Q&A recap post",            time: "9:00 AM",  status: "scheduled" },
    { platform: "twitter",   text: "Tips thread",               time: "11:00 AM", status: "scheduled" },
  ],
}

const PLATFORM_BAR_COLORS: Record<string, string> = {
  instagram: "#be185d",
  linkedin:  "#1d4ed8",
  twitter:   "#0369a1",
}

export function ScheduleTab() {
  const today = new Date()
  const [month, setMonth]       = useState(today.getMonth())
  const [year, setYear]         = useState(today.getFullYear())
  const [selected, setSelected] = useState<number | null>(today.getDate())

  const firstDay  = new Date(year, month, 1).getDay()
  const daysCount = new Date(year, month + 1, 0).getDate()
  const monthName = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" })

  const prev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1)
    setSelected(null)
  }
  const next = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1)
    setSelected(null)
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ]

  const selectedPosts = selected ? (SCHEDULED_POSTS[selected] ?? []) : []
  const totalPostsThisMonth = Object.values(SCHEDULED_POSTS).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="flex flex-col gap-5">

      {/* ── Month summary strip ───────────────────────────────────────────── */}
      <div
        className="grid grid-cols-3 rounded-2xl overflow-hidden border"
        style={{ borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
      >
        {[
          { label: "Scheduled",  value: "14", bg: "#e6f5ee", color: "#1a5c3a" },
          { label: "Drafts",     value: "4",  bg: "#fef3c7", color: "#92400e" },
          { label: "Published",  value: String(totalPostsThisMonth - 18), bg: "#d1fae5", color: "#065f46" },
        ].map((s, i) => (
          <div
            key={s.label}
            className="flex flex-col items-center py-4 gap-[4px]"
            style={{
              background: "#ffffff",
              borderRight: i < 2 ? "1px solid rgba(0,0,0,0.07)" : "none",
            }}
          >
            <p
              className="text-[26px] font-bold"
              style={{ color: s.color, letterSpacing: "-0.03em" }}
            >
              {s.value}
            </p>
            <span
              className="text-[11px] font-semibold px-3 py-[3px] rounded-full"
              style={{ background: s.bg, color: s.color }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        {/* ── Calendar ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader title="Publishing calendar" sub="Click a day to see scheduled posts">
            <IconButton onClick={prev} aria-label="Previous month">
              <ChevronLeft className="w-[14px] h-[14px]" />
            </IconButton>
            <span
              className="text-[12px] font-semibold min-w-[130px] text-center"
              style={{ color: "#374151" }}
            >
              {monthName}
            </span>
            <IconButton onClick={next} aria-label="Next month">
              <ChevronRight className="w-[14px] h-[14px]" />
            </IconButton>
          </CardHeader>

          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div
                key={d}
                className="text-[10px] font-bold text-center py-[6px]"
                style={{ color: "#9ca3af" }}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-[2px]">
            {cells.map((day, i) => {
              if (!day) return <div key={`blank-${i}`} />
              const posts      = SCHEDULED_POSTS[day] ?? []
              const isToday    = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isSelected = day === selected

              return (
                <button
                  key={day}
                  onClick={() => setSelected(day)}
                  className="relative flex flex-col items-center rounded-xl py-2 px-1 text-[12px] font-semibold transition-all duration-150 min-h-[54px]"
                  style={{
                    background: isSelected
                      ? "#1a5c3a"
                      : isToday
                      ? "#e6f5ee"
                      : "transparent",
                    color: isSelected
                      ? "#ffffff"
                      : isToday
                      ? "#1a5c3a"
                      : "#374151",
                    border: isSelected
                      ? "none"
                      : isToday
                      ? "1px solid rgba(26,92,58,0.3)"
                      : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      ;(e.currentTarget as HTMLButtonElement).style.background = "#f0f2f7"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      ;(e.currentTarget as HTMLButtonElement).style.background = isToday ? "#e6f5ee" : "transparent"
                    }
                  }}
                >
                  {day}
                  {posts.length > 0 && (
                    <div className="flex gap-[2px] mt-[3px] flex-wrap justify-center">
                      {posts.slice(0, 3).map((p, pi) => (
                        <div
                          key={pi}
                          className="w-[5px] h-[5px] rounded-full"
                          style={{
                            background: isSelected ? "rgba(255,255,255,0.7)" : PLATFORM_BAR_COLORS[p.platform],
                          }}
                        />
                      ))}
                      {posts.length > 3 && (
                        <div
                          className="w-[5px] h-[5px] rounded-full"
                          style={{ background: isSelected ? "rgba(255,255,255,0.4)" : "#d1d5db" }}
                        />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div
            className="flex items-center gap-5 mt-4 pt-4"
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
          >
            {[
              { color: "#be185d", label: "Instagram"   },
              { color: "#1d4ed8", label: "LinkedIn"    },
              { color: "#0369a1", label: "Twitter / X" },
            ].map((l) => (
              <span
                key={l.label}
                className="flex items-center gap-[6px] text-[11px] font-medium"
                style={{ color: "#6b7280" }}
              >
                <span
                  className="w-[8px] h-[8px] rounded-full"
                  style={{ background: l.color }}
                />
                {l.label}
              </span>
            ))}
          </div>
        </Card>

        {/* ── Day detail panel ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader
            title={
              selected
                ? `${new Date(year, month).toLocaleString("default", { month: "long" })} ${selected}`
                : "Select a day"
            }
            sub={
              selectedPosts.length
                ? `${selectedPosts.length} post${selectedPosts.length > 1 ? "s" : ""} scheduled`
                : "No posts scheduled"
            }
          >
            <button
              className="h-8 px-3 text-[11px] font-semibold rounded-xl border flex items-center gap-1 transition-all duration-150"
              style={{
                borderColor: "rgba(26,92,58,0.3)",
                color: "#1a5c3a",
                background: "#e6f5ee",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = "#d1fae5"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = "#e6f5ee"
              }}
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </CardHeader>

          {selectedPosts.length === 0 ? (
            <EmptyState
              icon={<Plus className="w-5 h-5" />}
              title="No posts for this day"
              description='Click "Add" to schedule something'
            />
          ) : (
            <div className="flex flex-col gap-[6px]">
              {selectedPosts.map((post, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 rounded-xl border transition-colors duration-150"
                  style={{
                    background: "#f5f6fa",
                    borderColor: "rgba(0,0,0,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = "#e6f5ee"
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = "rgba(26,92,58,0.2)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = "#f5f6fa"
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.07)"
                  }}
                >
                  <PlatformIcon platform={post.platform} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12px] leading-relaxed line-clamp-2 font-medium"
                      style={{ color: "#374151" }}
                    >
                      {post.text}
                    </p>
                    <div className="flex items-center gap-2 mt-[7px]">
                      <span className="text-[10px] font-medium" style={{ color: "#9ca3af" }}>
                        {post.time}
                      </span>
                      <StatusPill status={post.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}