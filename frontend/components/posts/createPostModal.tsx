// components/posts/create-post-modal.tsx
"use client"

import * as React from "react"
import {
  AlertCircle,
  CalendarClock,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Plus,
  Twitter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useCategories } from "@/hooks/useCategories"
import { postsApi } from "@/lib/post"
import { ApiError } from "@/lib/client"
import type { ApiErrorBody, Platform, Post } from "@/lib/types"
import { CreateCategoryDialog } from "./createCategoryDialog"

const PLATFORM_OPTIONS: {
  value: Platform
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "x", label: "X", icon: Twitter },
  { value: "facebook", label: "Facebook", icon: Facebook },
]

// Twitter's character limit is the tightest constraint in the mix — the backend
// uses it as a safe ceiling for `content`, so the UI mirrors that here.
const CONTENT_MAX = 63206

/** Formats a Date as a local "YYYY-MM-DDTHH:mm" string for <input type="datetime-local">. */
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
}

interface CreatePostModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: (post: Post) => void
  /** Pre-fill scheduling, e.g. when the user clicks a specific day in the schedule view. */
  defaultScheduledAt?: string
  /** Custom trigger element. Omit to get a default "New Post" button. */
  trigger?: React.ReactNode
}

export function CreatePostModal({
  open,
  onOpenChange,
  onCreated,
  defaultScheduledAt,
  trigger,
}: CreatePostModalProps) {
  const { categories, isLoading: categoriesLoading } = useCategories()

  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen

  // Stable, unique field ids so multiple instances of this modal never collide in the DOM.
  const idPrefix = React.useId()
  const categoryFieldId = `${idPrefix}-category`
  const titleFieldId = `${idPrefix}-title`
  const contentFieldId = `${idPrefix}-content`
  const hashtagsFieldId = `${idPrefix}-hashtags`

  const [categoryId, setCategoryId] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [platforms, setPlatforms] = React.useState<Platform[]>([])
  const [isScheduled, setIsScheduled] = React.useState(Boolean(defaultScheduledAt))
  const [scheduledAt, setScheduledAt] = React.useState(defaultScheduledAt ?? "")
  const [hashtags, setHashtags] = React.useState("")
  const [newCategoryOpen, setNewCategoryOpen] = React.useState(false)

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})

  // Guards state updates that would otherwise land after the component (or modal) is gone —
  // e.g. the user navigates away while the create request is still in flight.
  const isMountedRef = React.useRef(true)
  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const resetForm = React.useCallback(() => {
    setCategoryId("")
    setTitle("")
    setContent("")
    setPlatforms([])
    setIsScheduled(Boolean(defaultScheduledAt))
    setScheduledAt(defaultScheduledAt ?? "")
    setHashtags("")
    setFormError(null)
    setFieldErrors({})
  }, [defaultScheduledAt])

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const togglePlatform = (value: Platform) => {
    setPlatforms((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]))
    clearFieldError("platforms")
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    const trimmedContent = content.trim()

    if (!categoryId) errors.category_id = "Choose a category for this post."

    if (!trimmedContent) {
      errors.content = "Post content can't be empty."
    } else if (trimmedContent.length > CONTENT_MAX) {
      errors.content = `Content is ${(trimmedContent.length - CONTENT_MAX).toLocaleString()} characters over the limit.`
    }

    if (platforms.length === 0) errors.platforms = "Select at least one platform."

    if (isScheduled) {
      if (!scheduledAt) {
        errors.scheduled_at = "Pick a date and time to schedule this post."
      } else if (new Date(scheduledAt).getTime() <= Date.now()) {
        errors.scheduled_at = "Scheduled time must be in the future."
      }
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    setFormError(null)
    setFieldErrors({})

    try {
      const post = await postsApi.create({
        category_id: categoryId,
        title: title.trim() || undefined,
        content: content.trim(),
        platforms,
        scheduled_at: isScheduled ? new Date(scheduledAt).toISOString() : undefined,
        metadata: hashtags.trim()
          ? {
              hashtags: Array.from(
                new Set(
                  hashtags
                    .split(",")
                    .map((tag) => tag.trim().replace(/^#/, ""))
                    .filter(Boolean),
                ),
              ),
            }
          : undefined,
      })

      if (!isMountedRef.current) return
      onCreated?.(post)
      resetForm()
      setDialogOpen(false)
    } catch (err) {
      if (!isMountedRef.current) return

      if (err instanceof ApiError) {
        const body = err.raw as ApiErrorBody | undefined
        if (body?.fields) {
          setFieldErrors((prev) => ({ ...prev, ...body.fields }))
        }
        setFormError(err.message)
      } else {
        setFormError("Couldn't create the post. Try again.")
      }
    } finally {
      if (isMountedRef.current) setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        if (isSubmitting) return
        setDialogOpen(next)
        if (!next) resetForm()
      }}
    >
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Create post</DialogTitle>
          <DialogDescription>Write once, publish to every connected platform.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor={categoryFieldId}>Category</Label>
            <div className="flex gap-2">
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value)
                  clearFieldError("category_id")
                }}
                disabled={isSubmitting || categoriesLoading}
              >
                <SelectTrigger
                  id={categoryFieldId}
                  aria-invalid={Boolean(fieldErrors.category_id)}
                  className={cn("flex-1", fieldErrors.category_id && "border-red-500 focus:ring-red-500")}
                >
                  <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select a category"} />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <CreateCategoryDialog
                open={newCategoryOpen}
                onOpenChange={setNewCategoryOpen}
                onCreated={(category) => {
                  setCategoryId(category.id)
                  clearFieldError("category_id")
                }}
                trigger={
                  <Button type="button" variant="outline" size="icon" title="New category" disabled={isSubmitting}>
                    <Plus className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
            {fieldErrors.category_id && <p className="text-xs text-red-600">{fieldErrors.category_id}</p>}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor={titleFieldId}>Title (optional)</Label>
            <Input
              id={titleFieldId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Internal label for this post"
              maxLength={255}
              disabled={isSubmitting}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={contentFieldId}>Content</Label>
              <span className={cn("text-xs", content.length > CONTENT_MAX ? "text-red-600" : "text-gray-400")}>
                {content.length.toLocaleString()} / {CONTENT_MAX.toLocaleString()}
              </span>
            </div>
            <Textarea
              id={contentFieldId}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                clearFieldError("content")
              }}
              placeholder="What do you want to share?"
              rows={6}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.content)}
              className={cn(fieldErrors.content && "border-red-500 focus-visible:ring-red-500")}
            />
            {fieldErrors.content && <p className="text-xs text-red-600">{fieldErrors.content}</p>}
          </div>

          {/* Platforms */}
          <div className="space-y-1.5">
            <Label>Platforms</Label>
            <div role="group" aria-label="Platforms" className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map(({ value, label, icon: Icon }) => {
                const selected = platforms.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => togglePlatform(value)}
                    disabled={isSubmitting}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c3a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                      selected
                        ? "border-[#1a5c3a] bg-[#e6f5ee] text-[#1a5c3a]"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                )
              })}
            </div>
            {fieldErrors.platforms && <p className="text-xs text-red-600">{fieldErrors.platforms}</p>}
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <Label htmlFor={hashtagsFieldId}>Hashtags (optional, comma-separated)</Label>
            <Input
              id={hashtagsFieldId}
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="launch, productivity, saas"
              disabled={isSubmitting}
            />
          </div>

          {/* Scheduling */}
          <div className="space-y-2 rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-medium text-gray-700">
                <CalendarClock className="h-4 w-4 text-gray-400" />
                Schedule for later
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isScheduled}
                aria-label="Schedule for later"
                onClick={() => {
                  setIsScheduled((v) => !v)
                  clearFieldError("scheduled_at")
                }}
                disabled={isSubmitting}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c3a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                  isScheduled ? "bg-[#1a5c3a]" : "bg-gray-200",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                    isScheduled ? "translate-x-[18px]" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            {isScheduled ? (
              <>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => {
                    setScheduledAt(e.target.value)
                    clearFieldError("scheduled_at")
                  }}
                  disabled={isSubmitting}
                  min={toDatetimeLocalValue(new Date())}
                  aria-invalid={Boolean(fieldErrors.scheduled_at)}
                  className={cn(fieldErrors.scheduled_at && "border-red-500 focus-visible:ring-red-500")}
                />
                {fieldErrors.scheduled_at && <p className="text-xs text-red-600">{fieldErrors.scheduled_at}</p>}
              </>
            ) : (
              <p className="text-xs text-gray-400">
                This post is saved as a draft. Publish it manually from the Queue tab whenever you're ready.
              </p>
            )}
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{formError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm()
                setDialogOpen(false)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isScheduled ? "Schedule post" : "Save draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}