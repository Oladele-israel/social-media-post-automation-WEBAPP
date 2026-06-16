// internal/posts/model.go
package posts

import (
	"time"

	"github.com/Oladele-israel/socialmedia-post-automation/internal/auth/providers"
)

// ══════════════════════════════════════════════════════════════
//  CATEGORY
// ══════════════════════════════════════════════════════════════

// Category represents a post category row.
//
// db tags  → used by sqlx to map column names to struct fields.
// json tags → used by encoding/json when we respond to the API caller.
//
// *string vs string: UserID is a pointer because it can be NULL in the DB
// (system categories have no owner). A Go string cannot represent NULL;
// a *string can — when it's nil the JSON encoder writes null, and sqlx
// scans a DB NULL into nil without error.
type Category struct {
	ID          string    `db:"id"          json:"id"`
	UserID      *string   `db:"user_id"     json:"user_id"` // nil = system category
	Name        string    `db:"name"        json:"name"`
	Description *string   `db:"description" json:"description"`
	Slug        string    `db:"slug"        json:"slug"`
	IsActive    bool      `db:"is_active"   json:"is_active"`
	CreatedAt   time.Time `db:"created_at"  json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"  json:"updated_at"`
}

// CreateCategoryInput carries the validated fields for a new category.
// validate tags are read by our validator package (mirrors your existing pattern).
type CreateCategoryInput struct {
	Name        string  `json:"name"        validate:"required,min=1,max=100"`
	Description *string `json:"description" validate:"omitempty,max=500"`
}

// UpdateCategoryInput — all fields optional (PATCH semantics).
// *string means "the client sent this field"; nil means "leave it alone".
type UpdateCategoryInput struct {
	Name        *string `json:"name"        validate:"omitempty,min=1,max=100"`
	Description *string `json:"description" validate:"omitempty,max=500"`
	IsActive    *bool   `json:"is_active"`
}

type PostStatus string

const (
	StatusDraft     PostStatus = "draft"
	StatusScheduled PostStatus = "scheduled"
	StatusPublished PostStatus = "published"
	StatusFailed    PostStatus = "failed"
	StatusCancelled PostStatus = "cancelled"
)

// ══════════════════════════════════════════════════════════════
//  MEDIA TYPE
// ══════════════════════════════════════════════════════════════

type MediaType string

const (
	MediaImage    MediaType = "image"
	MediaVideo    MediaType = "video"
	MediaDocument MediaType = "document"
)

// ══════════════════════════════════════════════════════════════
//  POST MEDIA
// ══════════════════════════════════════════════════════════════

type PostMedia struct {
	ID           string    `db:"id"            json:"id"`
	PostID       string    `db:"post_id"       json:"post_id"`
	MediaType    MediaType `db:"media_type"    json:"media_type"`
	URL          string    `db:"url"           json:"url"`
	ThumbnailURL *string   `db:"thumbnail_url" json:"thumbnail_url"`
	Filename     *string   `db:"filename"      json:"filename"`
	FileSize     *int64    `db:"file_size"     json:"file_size"`
	AltText      *string   `db:"alt_text"      json:"alt_text"`
	DurationSecs *int      `db:"duration_secs" json:"duration_secs"`
	Width        *int      `db:"width"         json:"width"`
	Height       *int      `db:"height"        json:"height"`
	DisplayOrder int       `db:"display_order" json:"display_order"`
	CreatedAt    time.Time `db:"created_at"    json:"created_at"`
}

// ══════════════════════════════════════════════════════════════
//  POST PUBLISH RESULT
// ══════════════════════════════════════════════════════════════

type PublishResult struct {
	ID             string             `db:"id"               json:"id"`
	PostID         string             `db:"post_id"          json:"post_id"`
	Platform       providers.Platform `db:"platform"         json:"platform"`
	Status         string             `db:"status"           json:"status"`
	PlatformPostID *string            `db:"platform_post_id" json:"platform_post_id"`
	ErrorMessage   *string            `db:"error_message"    json:"error_message"`
	AttemptedAt    time.Time          `db:"attempted_at"     json:"attempted_at"`
}

// ══════════════════════════════════════════════════════════════
//  POST  (the main entity)
// ══════════════════════════════════════════════════════════════

// Platforms is a custom type that wraps []string.
// We need this so sqlx knows how to scan JSONB from Postgres into a Go slice.
// The db/json_types.go file (below) implements the sql.Scanner and
// driver.Valuer interfaces on this type.
type Platforms []string

// Post is the main struct. Note:
//   - Category is embedded by value when we do a JOIN query (see repository)
//   - Media is loaded separately and attached after the main query
//   - DeletedAt is a pointer — NULL in DB maps to nil in Go
type Post struct {
	ID          string     `db:"id"           json:"id"`
	UserID      string     `db:"user_id"      json:"user_id"`
	CategoryID  string     `db:"category_id"  json:"category_id"`
	Title       *string    `db:"title"        json:"title"`
	Content     string     `db:"content"      json:"content"`
	Status      PostStatus `db:"status"       json:"status"`
	ScheduledAt *time.Time `db:"scheduled_at" json:"scheduled_at"`
	PublishedAt *time.Time `db:"published_at" json:"published_at"`
	Platforms   Platforms  `db:"platforms"    json:"platforms"`
	Metadata    Metadata   `db:"metadata"     json:"metadata"`
	DeletedAt   *time.Time `db:"deleted_at"   json:"deleted_at,omitempty"`
	CreatedAt   time.Time  `db:"created_at"   json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at"   json:"updated_at"`

	// These are NOT db columns — they are populated after the main query
	// by joining/loading related data. The `db:"-"` tag tells sqlx to
	// ignore these fields during scanning.
	Category *Category    `db:"-" json:"category,omitempty"`
	Media    []*PostMedia `db:"-" json:"media,omitempty"`
}

// Metadata holds optional platform-specific extras.
// We store it as JSONB; see json_types.go for the scanner implementation.
type Metadata struct {
	Hashtags     []string `json:"hashtags,omitempty"`
	FirstComment string   `json:"first_comment,omitempty"`
	Location     string   `json:"location,omitempty"`
	AltText      string   `json:"alt_text,omitempty"`
}

// ── Input DTOs ────────────────────────────────────────────────

// CreatePostInput is what the client sends when creating a post.
type CreatePostInput struct {
	CategoryID  string    `json:"category_id"  validate:"required,uuid4"`
	Title       *string   `json:"title"        validate:"omitempty,max=255"`
	Content     string    `json:"content"      validate:"required,min=1,max=63206"` // Twitter's limit is a safe ceiling
	Platforms   []string  `json:"platforms"    validate:"required,min=1,dive,oneof=linkedin instagram x facebook"`
	ScheduledAt *string   `json:"scheduled_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
	Metadata    *Metadata `json:"metadata"`
}

// UpdatePostInput — PATCH semantics, all optional.
type UpdatePostInput struct {
	CategoryID  *string   `json:"category_id"  validate:"omitempty,uuid4"`
	Title       *string   `json:"title"        validate:"omitempty,max=255"`
	Content     *string   `json:"content"      validate:"omitempty,min=1,max=63206"`
	Platforms   []string  `json:"platforms"    validate:"omitempty,min=1,dive,oneof=linkedin instagram x facebook"`
	ScheduledAt *string   `json:"scheduled_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
	Metadata    *Metadata `json:"metadata"`
}

// AddMediaInput is sent when attaching a media file to a post.
type AddMediaInput struct {
	MediaType    MediaType `json:"media_type"    validate:"required,oneof=image video document"`
	URL          string    `json:"url"           validate:"required,url"`
	ThumbnailURL *string   `json:"thumbnail_url" validate:"omitempty,url"`
	Filename     *string   `json:"filename"      validate:"omitempty,max=255"`
	FileSize     *int64    `json:"file_size"     validate:"omitempty,min=1"`
	AltText      *string   `json:"alt_text"      validate:"omitempty,max=1000"`
	DurationSecs *int      `json:"duration_secs" validate:"omitempty,min=1"`
	Width        *int      `json:"width"         validate:"omitempty,min=1"`
	Height       *int      `json:"height"        validate:"omitempty,min=1"`
	DisplayOrder int       `json:"display_order" validate:"min=0"`
}

// ── List / filter ─────────────────────────────────────────────

// ListPostsFilter carries query parameters for the list endpoint.
type ListPostsFilter struct {
	Status     *PostStatus `json:"status"`
	CategoryID *string     `json:"category_id"`
	Platform   *string     `json:"platform"`
	Page       int         `json:"page"`      // 1-based
	PageSize   int         `json:"page_size"` // default 20, max 100
}

// PostsPage wraps a page of results with pagination metadata.
type PostsPage struct {
	Posts    []*Post `json:"posts"`
	Total    int     `json:"total"`
	Page     int     `json:"page"`
	PageSize int     `json:"page_size"`
	HasMore  bool    `json:"has_more"`
}
