// lib/api/categories.ts
import { client } from "@/lib/client"
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/lib/types"

export const categoriesApi = {
  list: () =>
    client
      .get<{ categories: Category[]; total: number }>("/categories")
      .then((res) => res.data),

  get: (id: string) =>
    client.get<Category>(`/categories/${id}`).then((res) => res.data),

  create: (input: CreateCategoryInput) =>
    client.post<Category>("/categories", input).then((res) => res.data),

  update: (id: string, input: UpdateCategoryInput) =>
    client.patch<Category>(`/categories/${id}`, input).then((res) => res.data),

  remove: (id: string) =>
    client.delete<{ message: string }>(`/categories/${id}`).then((res) => res.data),
}