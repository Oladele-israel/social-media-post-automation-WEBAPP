"use client"

import { motion } from "framer-motion"
import { Archive, Clock, FileText, Layers, Plus, Search, Share2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { projects } from "@/data"

// ─── Project Templates data (local — only used here) ─────────────────────────
const templates = [
  { title: "Brand Identity",     subtitle: "Complete brand design package",        gradient: "from-blue-500 to-purple-600", badge: "Popular"  },
  { title: "Marketing Campaign", subtitle: "Multi-channel marketing assets",        gradient: "from-amber-500 to-red-600",   badge: "New"      },
  { title: "Website Redesign",   subtitle: "Complete website design workflow",      gradient: "from-green-500 to-teal-600",  badge: "Featured" },
  { title: "Product Launch",     subtitle: "Product launch campaign assets",        gradient: "from-pink-500 to-rose-600",   badge: "Popular"  },
]

export function ProjectsTab() {
  return (
    <div className="space-y-8">
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 p-8 text-white"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Project Management</h2>
              <p className="max-w-[600px] text-white/80">
                Organize your creative work into projects and collaborate with your team.
              </p>
            </div>
            <Button className="w-fit rounded-2xl bg-white text-indigo-700 hover:bg-white/90">
              <Plus className="mr-2 h-4 w-4" />New Project
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="rounded-2xl"><Layers  className="mr-2 h-4 w-4" />All Projects</Button>
        <Button variant="outline" className="rounded-2xl"><Clock   className="mr-2 h-4 w-4" />Recent</Button>
        <Button variant="outline" className="rounded-2xl"><Users   className="mr-2 h-4 w-4" />Shared</Button>
        <Button variant="outline" className="rounded-2xl"><Archive className="mr-2 h-4 w-4" />Archived</Button>
        <div className="flex-1" />
        <div className="relative w-full md:w-auto mt-3 md:mt-0">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search projects..." className="w-full rounded-2xl pl-9 md:w-[200px]" />
        </div>
      </div>

      {/* ── Active Projects ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Active Projects</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <motion.div key={project.name} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
              <Card className="overflow-hidden rounded-3xl border hover:border-primary/50 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{project.name}</CardTitle>
                    <Badge variant="outline" className="rounded-xl">Due {project.dueDate}</Badge>
                  </div>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2 rounded-xl" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />{project.members} members
                    </div>
                    <div className="flex items-center">
                      <FileText className="mr-1 h-4 w-4" />{project.files} files
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="secondary" className="flex-1 rounded-2xl">Open Project</Button>
                  <Button variant="outline" size="icon" className="rounded-2xl">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}

          {/* New project CTA */}
          <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
            <Card className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed p-8 hover:border-primary/50 transition-all duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium">Create New Project</h3>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Start a new creative project from scratch or use a template
              </p>
              <Button className="rounded-2xl">New Project</Button>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── Project Templates ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Project Templates</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {templates.map((tpl) => (
            <Card key={tpl.title} className="overflow-hidden rounded-3xl">
              <div className={`aspect-video bg-gradient-to-br ${tpl.gradient} p-6 text-white`}>
                <h3 className="text-lg font-medium">{tpl.title}</h3>
                <p className="text-sm text-white/80">{tpl.subtitle}</p>
              </div>
              <CardFooter className="flex justify-between p-4">
                <Badge variant="outline" className="rounded-xl">{tpl.badge}</Badge>
                <Button variant="ghost" size="sm" className="rounded-xl">Use Template</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}