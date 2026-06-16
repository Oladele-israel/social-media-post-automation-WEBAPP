// components/posts/create-category-dialog.tsx
"use client"

import * as React from "react"
import { AlertCircle, Loader2, Plus } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { useCategories } from "@/hooks/useCategories"
import { ApiError } from "@/lib/client"
import type { ApiErrorBody, Category } from "@/lib/types"

const NAME_MAX = 100
const DESCRIPTION_MAX = 500

interface CreateCategoryDialogProps {
  /** Pass open + onOpenChange to control the dialog from a parent (e.g. the post modal). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: (category: Category) => void
  /** Custom trigger element. Omit to get a default "New category" button. */
  trigger?: React.ReactNode
}

export function CreateCategoryDialog({ open, onOpenChange, onCreated, trigger }: CreateCategoryDialogProps) {
  const { createCategory } = useCategories()

  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen

  // Stable, unique field ids so this dialog never collides with itself in the DOM —
  // e.g. one instance nested inside the post modal, another opened from a categories page.
  const idPrefix = React.useId()
  const nameFieldId = `${idPrefix}-name`
  const descriptionFieldId = `${idPrefix}-description`

  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [formError, setFormError] = React.useState<string | null>(null)

  // Guards state updates that would otherwise land after the component (or dialog) is gone —
  // e.g. the user navigates away while the create request is still in flight.
  const isMountedRef = React.useRef(true)
  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const resetForm = React.useCallback(() => {
    setName("")
    setDescription("")
    setFieldErrors({})
    setFormError(null)
  }, [])

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setFieldErrors({ name: "Give this category a name." })
      return
    }

    setIsSubmitting(true)
    setFormError(null)
    setFieldErrors({})

    try {
      const category = await createCategory({
        name: trimmedName,
        description: description.trim() || undefined,
      })

      if (!isMountedRef.current) return
      onCreated?.(category)
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
        setFormError("Couldn't create the category. Try again.")
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
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New category
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-[420px] bg-white">
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
          <DialogDescription>Group posts so you can find and filter them later.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor={nameFieldId}>Name</Label>
            <Input
              id={nameFieldId}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                clearFieldError("name")
              }}
              placeholder="e.g. Product launches"
              maxLength={NAME_MAX}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.name)}
              className={cn(fieldErrors.name && "border-red-500 focus-visible:ring-red-500")}
              autoFocus
            />
            {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={descriptionFieldId}>Description (optional)</Label>
              <span className="text-xs text-gray-400">
                {description.length.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()}
              </span>
            </div>
            <Textarea
              id={descriptionFieldId}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                clearFieldError("description")
              }}
              placeholder="What kind of posts belong here?"
              maxLength={DESCRIPTION_MAX}
              rows={3}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.description)}
              className={cn(fieldErrors.description && "border-red-500 focus-visible:ring-red-500")}
            />
            {fieldErrors.description && <p className="text-xs text-red-600">{fieldErrors.description}</p>}
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
              Create category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}