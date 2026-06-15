"use client"

import { motion } from "framer-motion"
import { Download, Search, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { apps } from "@/data"

export function AppsTab() {
  return (
    <div className="space-y-8">
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-r from-pink-600 via-red-600 to-orange-600 p-8 text-white"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Creative Apps Collection</h2>
              <p className="max-w-[600px] text-white/80">
                Discover our full suite of professional design and creative applications.
              </p>
            </div>
            <Button className="w-fit rounded-2xl bg-white text-red-700 hover:bg-white/90">
              <Download className="mr-2 h-4 w-4" />
              Install Desktop App
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Category Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {["All Categories", "Creative", "Video", "Web", "3D"].map((cat) => (
          <Button key={cat} variant="outline" className="rounded-2xl">{cat}</Button>
        ))}
        <div className="flex-1" />
        <div className="relative w-full md:w-auto mt-3 md:mt-0">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search apps..." className="w-full rounded-2xl pl-9 md:w-[200px]" />
        </div>
      </div>

      {/* ── New Releases ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">New Releases</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {apps.filter((a) => a.new).map((app) => (
            <motion.div key={app.name} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
              <Card className="overflow-hidden rounded-3xl border-2 hover:border-primary/50 transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">{app.icon}</div>
                    <Badge className="rounded-xl bg-amber-500">New</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <CardTitle className="text-lg">{app.name}</CardTitle>
                  <CardDescription>{app.description}</CardDescription>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Installation</span>
                      <span>{app.progress}%</span>
                    </div>
                    <Progress value={app.progress} className="h-2 mt-1 rounded-xl" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="secondary" className="w-full rounded-2xl">
                    {app.progress < 100 ? "Continue Install" : "Open"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── All Apps ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">All Apps</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {apps.map((app) => (
            <motion.div key={app.name} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
              <Card className="overflow-hidden rounded-3xl border hover:border-primary/50 transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">{app.icon}</div>
                    <Badge variant="outline" className="rounded-xl">{app.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <CardTitle className="text-lg">{app.name}</CardTitle>
                  <CardDescription>{app.description}</CardDescription>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="secondary" className="flex-1 rounded-2xl">
                    {app.progress < 100 ? "Install" : "Open"}
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-2xl">
                    <Star className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}