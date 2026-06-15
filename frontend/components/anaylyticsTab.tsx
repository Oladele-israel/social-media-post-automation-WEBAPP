"use client"

import { useEffect, useRef, useState } from "react"
import { Lightbulb, TrendingUp, Clock, MoreHorizontal, Plus, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  KpiCard, Card, CardHeader, PlatformIcon,
  StatusPill, AiSuggestion, GhostButton, IconButton,
} from "@/components/uiPrimitives"

// ─── Static data ──────────────────────────────────────────────────────────────

const KPI_DATA = [
  {
    label: "Total reach",
    value: "284k",
    trend: "up" as const,
    trendLabel: "+18.4% vs last period",
    accent: "purple" as const,
    sparkPoints: "0,20 10,16 20,18 30,10 40,12 50,6 60,4",
  },
  {
    label: "Engagement rate",
    value: "4.7%",
    trend: "up" as const,
    trendLabel: "+2.1% vs last period",
    accent: "teal" as const,
    sparkPoints: "0,18 10,14 20,16 30,8 40,12 50,7 60,5",
  },
  {
    label: "Posts published",
    value: "47",
    trend: "neutral" as const,
    trendLabel: "Same as last period",
    accent: "amber" as const,
    sparkPoints: "0,14 10,14 20,10 30,14 40,10 50,12 60,10",
  },
  {
    label: "Link clicks",
    value: "12.3k",
    trend: "down" as const,
    trendLabel: "−5.6% vs last period",
    accent: "coral" as const,
    sparkPoints: "0,6 10,8 20,8 30,12 40,14 50,16 60,18",
  },
]

const QUEUE_ITEMS = [
  { platform: "instagram" as const, text: "Behind the scenes — how we built our onboarding flow with zero dev resources 🔧", time: "Today, 2:00 PM",    status: "scheduled" as const },
  { platform: "twitter"   as const, text: "3 things our most-engaged posts have in common (thread) 🧵",                    time: "Today, 5:30 PM",   status: "scheduled" as const },
  { platform: "linkedin"  as const, text: "Why most B2B content fails before it's even published — a breakdown",            time: "Tomorrow, 9:00 AM",status: "draft"     as const },
  { platform: "instagram" as const, text: "Product update: introducing multi-account scheduling 🎉",                        time: "Thu, 11:00 AM",    status: "scheduled" as const },
]

const PLATFORM_REACH = [
  { platform: "instagram" as const, label: "Instagram",   pct: 58, reach: "164.7k", color: "#be185d" },
  { platform: "linkedin"  as const, label: "LinkedIn",    pct: 28, reach: "79.5k",  color: "#1d4ed8" },
  { platform: "twitter"   as const, label: "Twitter / X", pct: 14, reach: "39.8k",  color: "#0369a1" },
]

const HEAT_MAP = [
  [1, 2, 3, 1, 2, 0, 0],
  [2, 3, 2, 3, 3, 1, 1],
  [3, 2, 1, 2, 3, 2, 1],
  [1, 0, 1, 0, 2, 3, 2],
]
const TIME_LABELS = ["9am", "12pm", "6pm", "9pm"]
const DAY_LABELS  = ["M", "T", "W", "T", "F", "S", "S"]

const CONTENT_TYPES = [
  { label: "Carousels",      pct: 88, rate: "8.8%", color: "#1a5c3a" },
  { label: "Video / Reels",  pct: 76, rate: "7.6%", color: "#be185d" },
  { label: "Long-form text", pct: 60, rate: "6.0%", color: "#1d4ed8" },
  { label: "Single image",   pct: 42, rate: "4.2%", color: "#d97706" },
  { label: "Text-only",      pct: 28, rate: "2.8%", color: "#9ca3af" },
]

const RANGE_OPTIONS = ["7d", "30d", "90d", "Custom"]

const PLATFORM_FILTERS = [
  { id: "all",       label: "All platforms", dotColor: "#1a5c3a" },
  { id: "instagram", label: "Instagram",     dotColor: "#be185d" },
  { id: "linkedin",  label: "LinkedIn",      dotColor: "#1d4ed8" },
  { id: "twitter",   label: "Twitter / X",   dotColor: "#0369a1" },
]

const CHART_LABELS = Array.from({ length: 30 }, (_, i) => i % 3 === 0 ? `Jun ${i + 1}` : "")
const IG_DATA = [420,480,510,390,620,700,680,590,640,720,810,790,840,760,800,860,920,880,950,1010,970,1050,1100,980,1040,1090,1150,1200,1180,1250]
const TW_DATA = [180,200,190,210,230,260,240,220,250,280,270,300,310,290,320,330,350,340,360,380,370,390,400,380,410,430,420,450,440,460]
const LI_DATA = [260,280,300,270,320,350,340,310,360,400,380,420,440,410,450,470,500,480,520,550,530,560,580,540,570,600,610,640,620,660]

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const [activeRange, setActiveRange]       = useState("30d")
  const [activePlatform, setActivePlatform] = useState("all")
  const chartRef      = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)

  useEffect(() => {
    let destroyed = false
    const loadChart = async () => {
      const { Chart, registerables } = await import("chart.js")
      Chart.register(...registerables)
      if (!chartRef.current || destroyed) return
      chartInstance.current?.destroy()
      chartInstance.current = new Chart(chartRef.current, {
        type: "line",
        data: {
          labels: CHART_LABELS,
          datasets: [
            {
              label: "Instagram",
              data: IG_DATA,
              borderColor: "#1a5c3a",
              backgroundColor: "rgba(26,92,58,0.06)",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.4,
              fill: true,
            },
            {
              label: "Twitter / X",
              data: TW_DATA,
              borderColor: "#0369a1",
              backgroundColor: "rgba(3,105,161,0.04)",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.4,
              fill: true,
            },
            {
              label: "LinkedIn",
              data: LI_DATA,
              borderColor: "#1d4ed8",
              backgroundColor: "rgba(29,78,216,0.04)",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#ffffff",
              borderColor: "rgba(0,0,0,0.1)",
              borderWidth: 1,
              titleColor: "#111827",
              bodyColor: "#6b7280",
              padding: 10,
              cornerRadius: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            },
          },
          scales: {
            x: {
              grid:   { color: "rgba(0,0,0,0.04)" },
              ticks:  { color: "#9ca3af", font: { size: 10 }, maxTicksLimit: 8 },
              border: { display: false },
            },
            y: {
              grid:   { color: "rgba(0,0,0,0.04)" },
              ticks:  { color: "#9ca3af", font: { size: 10 } },
              border: { display: false },
            },
          },
        },
      })
    }
    loadChart()
    return () => {
      destroyed = true
      chartInstance.current?.destroy()
    }
  }, [])

  return (
    <div className="flex flex-col gap-5">

      {/* ── Filters row ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {PLATFORM_FILTERS.map((p) => {
          const isActive = activePlatform === p.id
          return (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className="flex items-center gap-[7px] px-3 py-[5px] rounded-full text-[11px] font-semibold border transition-all duration-150"
              style={{
                borderColor: isActive ? "rgba(26,92,58,0.4)" : "rgba(0,0,0,0.1)",
                background:  isActive ? "#e6f5ee" : "#ffffff",
                color:       isActive ? "#1a5c3a" : "#6b7280",
                boxShadow:   isActive ? "none" : "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <span
                className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                style={{ background: isActive ? p.dotColor : "#d1d5db" }}
              />
              {p.label}
            </button>
          )
        })}
        <div className="ml-auto flex gap-[3px] p-[3px] rounded-xl" style={{ background: "#f0f2f7" }}>
          {RANGE_OPTIONS.map((r) => {
            const isActive = activeRange === r
            return (
              <button
                key={r}
                onClick={() => setActiveRange(r)}
                className="px-[10px] py-[5px] rounded-[9px] text-[11px] font-semibold transition-all duration-150"
                style={{
                  background:  isActive ? "#ffffff" : "transparent",
                  color:       isActive ? "#111827" : "#9ca3af",
                  boxShadow:   isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {r}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_DATA.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* ── Engagement chart ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Engagement over time" sub="Likes, comments & shares · last 30 days">
          <div className="hidden md:flex items-center gap-4 mr-2">
            {[
              { label: "Instagram",   color: "#1a5c3a" },
              { label: "Twitter / X", color: "#0369a1" },
              { label: "LinkedIn",    color: "#1d4ed8" },
            ].map((l) => (
              <span
                key={l.label}
                className="flex items-center gap-[5px] text-[11px] font-medium"
                style={{ color: "#6b7280" }}
              >
                <span
                  className="w-[14px] h-[3px] rounded-full inline-block"
                  style={{ background: l.color }}
                />
                {l.label}
              </span>
            ))}
          </div>
          <IconButton aria-label="More options">
            <MoreHorizontal className="w-[14px] h-[14px]" />
          </IconButton>
        </CardHeader>
        <div className="relative w-full h-[190px]">
          <canvas
            ref={chartRef}
            role="img"
            aria-label="Line chart showing engagement over the last 30 days"
          />
        </div>
      </Card>

      {/* ── Queue + Right panel ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

        {/* Upcoming queue */}
        <Card>
          <CardHeader title="Upcoming queue" sub="8 posts scheduled this week">
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
          <div className="flex flex-col">
            {QUEUE_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-[11px] border-b last:border-b-0"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
              >
                <PlatformIcon platform={item.platform} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] leading-relaxed truncate"
                    style={{ color: "#374151" }}
                  >
                    {item.text}
                  </p>
                  <div className="flex items-center gap-[8px] mt-[5px]">
                    <span
                      className="text-[10px] flex items-center gap-1 font-medium"
                      style={{ color: "#9ca3af" }}
                    >
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                    <StatusPill status={item.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <GhostButton className="mt-4">
            View full queue <ExternalLink className="w-3 h-3" />
          </GhostButton>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Platform reach */}
          <Card>
            <CardHeader title="Platform reach" sub="Share of total 284k reach" />
            <div className="flex flex-col">
              {PLATFORM_REACH.map((p) => (
                <div
                  key={p.platform}
                  className="flex items-center gap-3 py-[10px] border-b last:border-b-0"
                  style={{ borderColor: "rgba(0,0,0,0.06)" }}
                >
                  <PlatformIcon platform={p.platform} size="sm" />
                  <span
                    className="text-[12px] font-semibold min-w-[72px]"
                    style={{ color: "#374151" }}
                  >
                    {p.label}
                  </span>
                  <div
                    className="flex-1 h-[5px] rounded-full overflow-hidden"
                    style={{ background: "#f0f2f7" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.pct}%`, background: p.color }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-bold min-w-[28px] text-right"
                    style={{ color: p.color }}
                  >
                    {p.pct}%
                  </span>
                  <span
                    className="text-[10px] font-medium min-w-[46px] text-right"
                    style={{ color: "#9ca3af" }}
                  >
                    {p.reach}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Best times heatmap */}
          <Card>
            <CardHeader title="Best times to post" sub="Based on your audience activity" />
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "38px repeat(7, 1fr)" }}>
              <div />
              {DAY_LABELS.map((d, i) => (
                <div
                  key={i}
                  className="text-[9px] font-bold text-center pb-[2px]"
                  style={{ color: "#9ca3af" }}
                >
                  {d}
                </div>
              ))}
              {HEAT_MAP.map((row, ri) => (
                <>
                  <div
                    key={`label-${ri}`}
                    className="text-[9px] font-medium flex items-center"
                    style={{ color: "#9ca3af" }}
                  >
                    {TIME_LABELS[ri]}
                  </div>
                  {row.map((heat, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      className="h-[26px] rounded-lg"
                      style={{
                        background:
                          heat === 0
                            ? "#f5f6fa"
                            : `rgba(26,92,58,${heat * 0.25})`,
                      }}
                    />
                  ))}
                </>
              ))}
            </div>
            <div
              className="flex items-center gap-[6px] mt-4 text-[9px] font-semibold"
              style={{ color: "#9ca3af" }}
            >
              <span>Low</span>
              {[0, 0.25, 0.5, 0.75].map((o, i) => (
                <div
                  key={i}
                  className="w-3 h-[5px] rounded-sm"
                  style={{
                    background: i === 0 ? "#f5f6fa" : `rgba(26,92,58,${o})`,
                  }}
                />
              ))}
              <span>High</span>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Content types + AI recs ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Content types */}
        <Card>
          <CardHeader title="Top content types" sub="By average engagement rate" />
          <div className="flex flex-col gap-[2px]">
            {CONTENT_TYPES.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-3 py-[9px] border-b last:border-b-0"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
              >
                <span
                  className="text-[12px] font-medium min-w-[110px]"
                  style={{ color: "#374151" }}
                >
                  {c.label}
                </span>
                <div
                  className="flex-1 h-[5px] rounded-full overflow-hidden"
                  style={{ background: "#f0f2f7" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${c.pct}%`, background: c.color }}
                  />
                </div>
                <span
                  className="text-[11px] font-bold min-w-[34px] text-right"
                  style={{ color: c.color }}
                >
                  {c.rate}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* AI recommendations */}
        <Card>
          <CardHeader title="AI recommendations" sub="Powered by your performance data" />
          <div className="flex flex-col gap-[8px]">
            <AiSuggestion icon={<Lightbulb className="w-[13px] h-[13px]" />} variant="purple">
              <strong style={{ color: "#1a5c3a", fontWeight: 600 }}>Post 3 more carousels this week.</strong>{" "}
              Your carousel posts average 8.8% engagement — 2× your account average. Friday 12pm is your best open slot.
            </AiSuggestion>
            <AiSuggestion icon={<TrendingUp className="w-[13px] h-[13px]" />} variant="purple">
              <strong style={{ color: "#1a5c3a", fontWeight: 600 }}>LinkedIn reach is underutilised.</strong>{" "}
              You publish 60% of content to Instagram but LinkedIn drives higher click-through. Consider rebalancing your queue.
            </AiSuggestion>
            <AiSuggestion icon={<Clock className="w-[13px] h-[13px]" />} variant="amber">
              <strong style={{ color: "#92400e", fontWeight: 600 }}>3 posts</strong>{" "}
              in your queue have no scheduled time. Set times to avoid gaps in your publishing calendar.
            </AiSuggestion>
          </div>
          <GhostButton className="mt-4">
            <RefreshCw className="w-3 h-3" />
            Generate post ideas with AI
          </GhostButton>
        </Card>
      </div>
    </div>
  )
}