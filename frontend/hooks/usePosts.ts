// hooks/use-posts.ts
"use client"

import { useCallback, useEffect, useState } from "react"
import { postsApi } from "@/lib/post"
import { ApiError } from "@/lib"
import type { ListPostsFilter, Post, PostsPage } from "@/lib/types"

export function usePosts(filter: ListPostsFilter = {}) {
  const [page, setPage] = useState<PostsPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stable key so the effect only re-fires when the filter's *contents* change,
  // not when the caller passes a fresh object literal every render.
  const filterKey = JSON.stringify(filter)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await postsApi.list(JSON.parse(filterKey))
      setPage(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load posts.")
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addPost = useCallback((post: Post) => {
    setPage((prev) => (prev ? { ...prev, posts: [post, ...prev.posts], total: prev.total + 1 } : prev))
  }, [])

  const updatePostInList = useCallback((updated: Post) => {
    setPage((prev) =>
      prev ? { ...prev, posts: prev.posts.map((p) => (p.id === updated.id ? updated : p)) } : prev
    )
  }, [])

  const removePostFromList = useCallback((id: string) => {
    setPage((prev) =>
      prev ? { ...prev, posts: prev.posts.filter((p) => p.id !== id), total: Math.max(0, prev.total - 1) } : prev
    )
  }, [])

  return {
    posts: page?.posts ?? [],
    total: page?.total ?? 0,
    hasMore: page?.has_more ?? false,
    isLoading,
    error,
    refresh,
    addPost,
    updatePostInList,
    removePostFromList,
  }
}