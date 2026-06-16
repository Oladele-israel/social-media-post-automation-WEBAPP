// hooks/use-categories.ts
"use client"

import { useCallback, useEffect, useState } from "react"
import { categoriesApi } from "@/lib/categories"
import { ApiError } from "@/lib/client"
import type { Category, CreateCategoryInput } from "@/lib/types"

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await categoriesApi.list()
      setCategories(data.categories)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load categories.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createCategory = useCallback(async (input: CreateCategoryInput) => {
    const category = await categoriesApi.create(input)
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
    return category
  }, [])

  return { categories, isLoading, error, refresh, createCategory }
}