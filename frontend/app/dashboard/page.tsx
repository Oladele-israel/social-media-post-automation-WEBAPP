"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { MobileSidebar, DesktopSidebar } from "@/components/sidebar"
import { AppHeader } from "@/components/appHeader"
import { AnalyticsTab } from "@/components/anaylyticsTab"
import { ScheduleTab } from "@/components/ScheduleTab"
import { QueueTab } from "@/components/QueueTab"
import { CampaignsTab } from "@/components/campaignstab"
import { AccountsTab } from "@/components/accountsTab"

type Tab = "analytics" | "schedule" | "queue" | "campaigns" | "ai-writer" | "accounts"

const TAB_LABELS: Record<Tab, string> = {
  analytics:   "Analytics",
  schedule:    "Schedule",
  queue:       "Queue",
  campaigns:   "Campaigns",
  "ai-writer": "AI Writer",
  accounts: "Accounts",
}

export default function PostPilot() {
  const [activeTab, setActiveTab]           = useState<Tab>("analytics")
  const [sidebarOpen, setSidebarOpen]       = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const notifications = 5

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#f5f6fa" }}
    >
      {/* Subtle ambient gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 15% -5%, rgba(26,92,58,0.04) 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 85% 105%, rgba(46,204,143,0.03) 0%, transparent 60%)
          `,
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* ── Sidebars ─────────────────────────────────────────────────────── */}
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <DesktopSidebar
        open={sidebarOpen}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "relative min-h-screen flex flex-col transition-all duration-[280ms]",
          sidebarOpen ? "md:pl-64" : "md:pl-0"
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)", zIndex: 1 }}
      >
        <AppHeader
          notifications={notifications}
          sidebarOpen={sidebarOpen}
          activeTab={activeTab}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as Tab)}
            className="w-full"
          >
            {/* Tab bar */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <TabsList
                className="grid max-w-[600px] rounded-2xl p-[3px]"
                style={{
                  gridTemplateColumns: `repeat(5, 1fr)`,
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                {(["analytics", "schedule", "queue", "campaigns", "ai-writer"] as Tab[]).map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-xl text-[11px] font-semibold capitalize transition-all duration-150"
                    style={{ letterSpacing: "0.005em" }}
                  >
                    {TAB_LABELS[tab]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="hidden md:flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl text-[12px] font-semibold h-9"
                  style={{
                    borderColor: "rgba(0,0,0,0.1)",
                    color: "#6b7280",
                    background: "#ffffff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <Download className="mr-2 h-[13px] w-[13px]" />
                  Export
                </Button>
                <Button
                  className="rounded-xl text-white text-[12px] font-semibold h-9"
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
                  <Plus className="mr-2 h-[13px] w-[13px]" />
                  New Post
                </Button>
              </div>
            </div>

            {/* Animated tab panels */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <TabsContent value="analytics"  className="mt-0"><AnalyticsTab  /></TabsContent>
                <TabsContent value="schedule"   className="mt-0"><ScheduleTab   /></TabsContent>
                <TabsContent value="queue"      className="mt-0"><QueueTab      /></TabsContent>
                <TabsContent value="campaigns"  className="mt-0"><CampaignsTab  /></TabsContent>
                <TabsContent value="ai-writer"  className="mt-0">
                  <div
                    className="flex items-center justify-center py-24 rounded-2xl border"
                    style={{
                      borderColor: "rgba(0,0,0,0.07)",
                      background: "#ffffff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: "#e6f5ee" }}
                      >
                        <span style={{ fontSize: "20px" }}>✨</span>
                      </div>
                      <p className="text-[14px] font-semibold" style={{ color: "#374151" }}>
                        AI Writer coming soon
                      </p>
                      <p className="text-[12px]" style={{ color: "#9ca3af" }}>
                        Generate on-brand content in seconds
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="accounts" className="mt-0">
                  <AccountsTab />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </main>
      </div>
    </div>
  )
}