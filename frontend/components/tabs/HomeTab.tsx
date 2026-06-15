"use client"

import { motion } from "framer-motion"
import { Heart, MessageSquare, Star, Users, FileText } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { apps, recentFiles, projects, communityPosts } from "@/data"

export function HomeTab() {
  return (
    <div className="space-y-8">
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-8 text-white"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <Badge className="bg-white/20 text-white hover:bg-white/30 rounded-xl">Premium</Badge>
              <h2 className="text-3xl font-bold">Welcome to DesignAli Creative Suite</h2>
              <p className="max-w-[600px] text-white/80">
                Unleash your creativity with our comprehensive suite of professional design tools and resources.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="rounded-2xl bg-white text-indigo-700 hover:bg-white/90">Explore Plans</Button>
                <Button variant="outline" className="rounded-2xl bg-transparent border-white text-white hover:bg-white/10">
                  Take a Tour
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                className="relative h-40 w-40"
              >
                <div className="absolute inset-0  rounded-full bg-white/10 backdrop-blur-md" />
                <div className="absolute inset-4  rounded-full bg-white/20" />
                <div className="absolute inset-8  rounded-full bg-white/30" />
                <div className="absolute inset-12 rounded-full bg-white/40" />
                <div className="absolute inset-16 rounded-full bg-white/50" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Recent Apps ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent Apps</h2>
          <Button variant="ghost" className="rounded-2xl">View All</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {apps.filter((a) => a.recent).map((app) => (
            <motion.div key={app.name} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
              <Card className="overflow-hidden rounded-3xl border-2 hover:border-primary/50 transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">{app.icon}</div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-2xl">
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <CardTitle className="text-lg">{app.name}</CardTitle>
                  <CardDescription>{app.description}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button variant="secondary" className="w-full rounded-2xl">Open</Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Recent Files + Active Projects ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Recent Files */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent Files</h2>
            <Button variant="ghost" className="rounded-2xl">View All</Button>
          </div>
          <div className="rounded-3xl border">
            <div className="grid grid-cols-1 divide-y">
              {recentFiles.slice(0, 4).map((file) => (
                <motion.div
                  key={file.name}
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">{file.icon}</div>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{file.app} • {file.modified}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.shared && (
                      <Badge variant="outline" className="rounded-xl">
                        <Users className="mr-1 h-3 w-3" />
                        {file.collaborators}
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" className="rounded-xl">Open</Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Active Projects */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Active Projects</h2>
            <Button variant="ghost" className="rounded-2xl">View All</Button>
          </div>
          <div className="rounded-3xl border">
            <div className="grid grid-cols-1 divide-y">
              {projects.slice(0, 3).map((project) => (
                <motion.div
                  key={project.name}
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                  className="p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{project.name}</h3>
                    <Badge variant="outline" className="rounded-xl">Due {project.dueDate}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2 rounded-xl" />
                  </div>
                  <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />{project.members} members
                    </div>
                    <div className="flex items-center">
                      <FileText className="mr-1 h-4 w-4" />{project.files} files
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Community Highlights ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Community Highlights</h2>
          <Button variant="ghost" className="rounded-2xl">Explore</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {communityPosts.map((post) => (
            <motion.div key={post.title} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
              <Card className="overflow-hidden rounded-3xl">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={post.image || "/placeholder.svg"}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-sm text-muted-foreground">by {post.author}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />{post.likes}
                      <MessageSquare className="ml-2 h-4 w-4 text-blue-500" />{post.comments}
                    </div>
                    <span className="text-muted-foreground">{post.time}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}