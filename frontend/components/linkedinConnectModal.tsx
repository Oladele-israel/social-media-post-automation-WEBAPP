"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, ExternalLink, Linkedin, Lock, Shield, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LinkedInConnectModalProps {
  open: boolean
  onDismiss: () => void   // "remind me later" — soft dismiss
  onConnect: () => void   // triggers OAuth redirect
}

const benefits = [
  { icon: <Zap       className="h-4 w-4" />, text: "Auto-publish posts on your perfect schedule" },
  { icon: <CheckCircle2 className="h-4 w-4" />, text: "Track impressions, reactions & engagement live" },
  { icon: <Shield    className="h-4 w-4" />, text: "Read-only analytics — we never post without approval" },
]

export function LinkedInConnectModal({ open, onDismiss, onConnect }: LinkedInConnectModalProps) {
  const [connecting, setConnecting] = useState(false)

  const handleConnect = () => {
    setConnecting(true)
    // Simulate brief loading then delegate to parent
    setTimeout(() => onConnect(), 1200)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onDismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header gradient */}
              <div className="relative bg-gradient-to-br from-[#0A66C2] to-[#0056a3] px-8 pt-10 pb-8 text-white overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                <div className="absolute -right-4 top-8 h-24 w-24 rounded-full bg-white/5" />

                <div className="relative">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
                    <Linkedin className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold leading-tight mb-2">
                    Connect your LinkedIn
                  </h2>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    PostPilot needs access to your LinkedIn account to schedule and publish your content automatically.
                  </p>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={onDismiss}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-8 py-6 space-y-6">
                {/* Benefits */}
                <div className="space-y-3">
                  {benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0A66C2]">
                        {b.icon}
                      </div>
                      <span className="text-sm text-gray-700">{b.text}</span>
                    </div>
                  ))}
                </div>

                {/* Trust badge */}
                <div className="flex items-center gap-2.5 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
                  <Lock className="h-4 w-4 text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    We use LinkedIn's official OAuth 2.0. We never store your password and you can revoke access any time.
                  </p>
                </div>

                {/* CTA */}
                <div className="space-y-3">
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full h-12 rounded-2xl bg-[#0A66C2] hover:bg-[#0056a3] text-white font-semibold text-sm gap-2.5 transition-all"
                  >
                    {connecting ? (
                      <>
                        <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Connecting to LinkedIn…
                      </>
                    ) : (
                      <>
                        <Linkedin className="h-4 w-4" />
                        Connect LinkedIn Account
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </>
                    )}
                  </Button>

                  <button
                    onClick={onDismiss}
                    className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
                  >
                    Remind me later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}