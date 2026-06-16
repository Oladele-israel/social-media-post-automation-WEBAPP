// lib/types.ts

export interface RegisterPayload {
  email:     string
  password:  string
  full_name: string
}

export interface LoginPayload {
  email:    string
  password: string
}

// Matches Go backend response exactly — snake_case
export interface AuthResponse {
  user:            AuthUser
  access_token:    string
  access_token_id: string
  refresh_token:   string
}

export interface AuthUser {
  id:         string
  email:      string
  full_name:  string
  created_at: string
  updated_at: string
}

export interface SocialAccount {
  id:               string
  user_id:          string
  platform:         'linkedin' | 'instagram' | 'x' | 'facebook'
  platform_user_id: string
  name:             string
  email:            string
  token_expires_at: string
  created_at:       string
  updated_at:       string
}


// lib/types/posts.ts
//
// Mirrors internal/posts/model.go on the backend. Keep these in sync with
// the Go structs — field names match the `json` tags exactly.

export type PostStatus = "draft" | "scheduled" | "published" | "failed" | "cancelled"

export type MediaType = "image" | "video" | "document"

// NOTE: the backend's CreatePostInput validator allows facebook, but the
// ListPosts query-param validator (isValidPlatform in handler.go) currently
// does not. That's a backend inconsistency, not a frontend bug — flagged
// here so nobody "fixes" the UI to match the narrower list by mistake.
export type Platform = "linkedin" | "instagram" | "x" | "facebook"

export interface Category {
  id: string
  user_id: string | null // null = system category, not owned by this user
  name: string
  description: string | null
  slug: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateCategoryInput {
  name: string
  description?: string
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
  is_active?: boolean
}

export interface Metadata {
  hashtags?: string[]
  first_comment?: string
  location?: string
  alt_text?: string
}

export interface PostMedia {
  id: string
  post_id: string
  media_type: MediaType
  url: string
  thumbnail_url: string | null
  filename: string | null
  file_size: number | null
  alt_text: string | null
  duration_secs: number | null
  width: number | null
  height: number | null
  display_order: number
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  category_id: string
  title: string | null
  content: string
  status: PostStatus
  scheduled_at: string | null
  published_at: string | null
  platforms: Platform[]
  metadata: Metadata
  deleted_at?: string | null
  created_at: string
  updated_at: string
  // Populated by the backend when it joins/loads related data — not always present.
  category?: Category
  media?: PostMedia[]
}

export interface CreatePostInput {
  category_id: string
  title?: string
  content: string
  platforms: Platform[]
  scheduled_at?: string // RFC3339, e.g. new Date().toISOString()
  metadata?: Metadata
}

export interface UpdatePostInput {
  category_id?: string
  title?: string
  content?: string
  platforms?: Platform[]
  scheduled_at?: string
  metadata?: Metadata
}

export interface ListPostsFilter {
  status?: PostStatus
  category_id?: string
  platform?: Platform
  page?: number
  page_size?: number
}

export interface PostsPage {
  posts: Post[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface ApiErrorBody {
  error: string
  fields?: Record<string, string>
}