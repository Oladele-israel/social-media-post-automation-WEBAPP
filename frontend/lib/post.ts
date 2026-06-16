// lib/api/posts.ts
import { client } from "@/lib/client"
import type {
  CreatePostInput,
  ListPostsFilter,
  Post,
  PostsPage,
  UpdatePostInput,
} from "@/lib/types"

export const postsApi = {
  list: (filter: ListPostsFilter = {}) =>
    client.get<PostsPage>("/posts", { params: filter }).then((res) => res.data),

  get: (id: string) =>
    client.get<Post>(`/posts/${id}`).then((res) => res.data),

  create: (input: CreatePostInput) =>
    client.post<Post>("/posts", input).then((res) => res.data),

  update: (id: string, input: UpdatePostInput) =>
    client.patch<Post>(`/posts/${id}`, input).then((res) => res.data),

  remove: (id: string) =>
    client.delete<{ message: string }>(`/posts/${id}`).then((res) => res.data),

  // 202 Accepted on the backend — post is queued, not necessarily live yet.
  publish: (id: string) =>
    client
      .post<{ message: string; post: Post }>(`/posts/${id}/publish`)
      .then((res) => res.data),

  cancel: (id: string) =>
    client.post<Post>(`/posts/${id}/cancel`).then((res) => res.data),
}