// components/ScheduleTab.tsx
"use client"

import * as React from "react"
import { Calendar, Facebook, Instagram, Linkedin, Loader2, Plus, RefreshCw, Twitter, X as XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useCategories } from "@/hooks/useCategories"
import { usePosts } from "@/hooks/usePosts"
import { postsApi } from "@/lib/post"
import { ApiError } from "@/lib"
import type { Platform, Post, PostStatus } from "@/lib/types"
import { CreatePostModal } from "./posts/createPostModal"
import { CreateCategoryDialog } from "./posts/createCategoryDialog"

const PLATFORM_ICONS: Record<Platform, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  instagram: Instagram,
  x: Twitter,
  facebook: Facebook,
}

const STATUS_STYLES: Record<PostStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  scheduled: { label: "Scheduled", className: "bg-blue-50 text-blue-600" },
  published: { label: "Published", className: "bg-[#e6f5ee] text-[#1a5c3a]" },
  failed: { label: "Failed", className: "bg-red-50 text-red-600" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-400" },
}

function formatDateGroup(dateStr: string | null): string {
  if (!dateStr) return "No date"
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

const CARD_SURFACE = {
  borderColor: "rgba(0,0,0,0.07)",
  background: "#ffffff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
} as const

export function ScheduleTab() {
  const { categories, isLoading: categoriesLoading } = useCategories()
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [actionId, setActionId] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const filter = React.useMemo(
    () => ({
      category_id: categoryFilter !== "all" ? categoryFilter : undefined,
      status: statusFilter !== "all" ? (statusFilter as PostStatus) : undefined,
      page_size: 50,
    }),
    [categoryFilter, statusFilter]
  )

  const { posts, total, isLoading, error, refresh, addPost, updatePostInList, removePostFromList } = usePosts(filter)

  const categoryById = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const grouped = React.useMemo(() => {
    const groups = new Map<string, Post[]>()
    const sorted = [...posts].sort((a, b) => {
      const aTime = a.scheduled_at ?? a.created_at
      const bTime = b.scheduled_at ?? b.created_at
      return new Date(aTime).getTime() - new Date(bTime).getTime()
    })
    for (const post of sorted) {
      const key = formatDateGroup(post.scheduled_at ?? post.created_at)
      groups.set(key, [...(groups.get(key) ?? []), post])
    }
    return groups
  }, [posts])

  const runAction = async (post: Post, action: () => Promise<void>, fallbackMessage: string) => {
    setActionId(post.id)
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : fallbackMessage)
    } finally {
      setActionId(null)
    }
  }

  const handlePublishNow = (post: Post) =>
    runAction(
      post,
      async () => {
        const { post: updated } = await postsApi.publish(post.id)
        updatePostInList(updated)
      },
      "Couldn't queue this post for publishing."
    )

  const handleCancel = (post: Post) =>
    runAction(
      post,
      async () => {
        const updated = await postsApi.cancel(post.id)
        updatePostInList(updated)
      },
      "Couldn't cancel this post."
    )

  const handleDelete = (post: Post) =>
    runAction(
      post,
      async () => {
        await postsApi.remove(post.id)
        removePostFromList(post.id)
      },
      "Couldn't delete this post."
    )

  return (
    <div className="space-y-5">
      {/* ── Categories overview ─────────────────────────────────────── */}
      <div className="rounded-2xl border p-4" style={CARD_SURFACE}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-gray-700">Categories</h3>
          <CreateCategoryDialog
            trigger={
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-[12px]">
                <Plus className="h-3.5 w-3.5" />
                New category
              </Button>
            }
          />
        </div>

        {categoriesLoading ? (
          <div className="flex items-center gap-2 text-[12px] text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <p className="text-[12px] text-gray-400">No categories yet. Create one to start organizing your posts.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-colors",
                categoryFilter === "all"
                  ? "border-[#1a5c3a] bg-[#e6f5ee] text-[#1a5c3a]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              All ({total})
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setCategoryFilter(category.id)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  categoryFilter === category.id
                    ? "border-[#1a5c3a] bg-[#e6f5ee] text-[#1a5c3a]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  !category.is_active && "opacity-50"
                )}
                title={category.description ?? undefined}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Filters + new post ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[150px] rounded-xl text-[12px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl text-[12px]"
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <CreatePostModal onCreated={addPost} />
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
          {actionError}
        </div>
      )}

      {/* ── Posts ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border" style={CARD_SURFACE}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading posts...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-[13px] text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              Try again
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "#e6f5ee" }}>
              <Calendar className="h-5 w-5" style={{ color: "#1a5c3a" }} />
            </div>
            <p className="text-[14px] font-semibold text-gray-700">No posts yet</p>
            <p className="text-[12px] text-gray-400">Create your first post to see it here.</p>
            <CreatePostModal
              onCreated={addPost}
              trigger={
                <Button size="sm" className="mt-1 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  New Post
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            {Array.from(grouped.entries()).map(([dateLabel, datePosts]) => (
              <div key={dateLabel} className="p-4">
                <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-gray-400">{dateLabel}</h4>
                <div className="space-y-3">
                  {datePosts.map((post) => {
                    const category = post.category ?? categoryById.get(post.category_id)
                    const statusStyle = STATUS_STYLES[post.status]
                    const isActing = actionId === post.id

                    return (
                      <div
                        key={post.id}
                        className="flex flex-col gap-3 rounded-xl border p-3 md:flex-row md:items-start md:justify-between"
                        style={{ borderColor: "rgba(0,0,0,0.06)" }}
                      >
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", statusStyle.className)}>
                              {statusStyle.label}
                            </span>
                            {category && (
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                {category.name}
                              </span>
                            )}
                            {(post.scheduled_at || post.published_at) && (
                              <span className="text-[11px] text-gray-400">
                                {formatTime(post.scheduled_at ?? post.published_at)}
                              </span>
                            )}
                          </div>

                          {post.title && <p className="text-[13px] font-semibold text-gray-800">{post.title}</p>}
                          <p className="line-clamp-2 text-[13px] text-gray-600">{post.content}</p>

                          <div className="flex items-center gap-1.5 pt-0.5">
                            {post.platforms.map((platform) => {
                              const Icon = PLATFORM_ICONS[platform]
                              return Icon ? (
                                <span
                                  key={platform}
                                  className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-gray-500"
                                  title={platform}
                                >
                                  <Icon className="h-3 w-3" />
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          {(post.status === "draft" || post.status === "scheduled") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-[12px]"
                              disabled={isActing}
                              onClick={() => handlePublishNow(post)}
                            >
                              {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Publish now"}
                            </Button>
                          )}

                          {post.status === "scheduled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg text-[12px] text-gray-500"
                              disabled={isActing}
                              onClick={() => handleCancel(post)}
                            >
                              Cancel
                            </Button>
                          )}

                          {post.status === "draft" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg p-0 text-gray-400 hover:text-red-600"
                              disabled={isActing}
                              onClick={() => handleDelete(post)}
                              title="Delete draft"
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}