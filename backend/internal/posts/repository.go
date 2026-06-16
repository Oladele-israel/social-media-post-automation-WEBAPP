// internal/posts/repository.go
package posts

// ─────────────────────────────────────────────────────────────────
//  THE REPOSITORY PATTERN
// ─────────────────────────────────────────────────────────────────
// The repository is the ONLY place raw SQL lives.
// The service calls repository methods; it never writes SQL itself.
// Benefits:
//   • If you swap Postgres for something else, only this file changes.
//   • SQL is easy to find and audit — it's not scattered across the codebase.
//   • You can unit-test the service by mocking the repository.
// ─────────────────────────────────────────────────────────────────

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Oladele-israel/socialmedia-post-automation/pkg/database"
)

// Repository wraps a *sqlx.DB.
// We store the interface sqlx.ExtContext rather than *sqlx.DB so that
// in tests we can pass a *sqlx.Tx (transaction) instead — the same
// repository methods work inside or outside a transaction

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// ══════════════════════════════════════════════════════════════
//  CATEGORY QUERIES
// ══════════════════════════════════════════════════════════════

// GetCategoriesForUser returns system categories PLUS the user's own categories.
//
// SQL breakdown:
//
//	WHERE (user_id = $1 OR user_id IS NULL)
//	→ system categories (NULL owner) are always included
//	→ user's own categories are included
//	AND is_active = true   → skip soft-deleted categories
//	ORDER BY user_id NULLS FIRST  → system categories come first in the list
func (r *Repository) GetCategoriesForUser(ctx context.Context, userID string) ([]*Category, error) {
	const q = `
		SELECT id, user_id, name, description, slug, is_active, created_at, updated_at
		FROM categories
		WHERE (user_id = $1 OR user_id IS NULL)
		  AND is_active = true
		ORDER BY user_id NULLS FIRST, name ASC`

	// sqlx.SelectContext scans multiple rows directly into a slice.
	// It uses the `db` struct tags to match columns to fields.
	var cats []*Category
	if err := r.db.SelectContext(ctx, &cats, q, userID); err != nil {
		return nil, fmt.Errorf("get categories: %w", err)
	}
	return cats, nil
}

func (r *Repository) GetCategoryByID(ctx context.Context, id string) (*Category, error) {
	const q = `
		SELECT id, user_id, name, description, slug, is_active, created_at, updated_at
		FROM categories
		WHERE id = $1`

	var cat Category
	// sqlx.GetContext scans exactly one row. Returns sql.ErrNoRows if not found.
	if err := r.db.GetContext(ctx, &cat, q, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get category: %w", err)
	}
	return &cat, nil
}

// CreateCategory inserts a user-owned category and returns the full row.
//
// RETURNING * — a PostgreSQL extension that returns the inserted row.
// This means we get the generated UUID, timestamps, and defaults
// without a second SELECT query. Very efficient.
func (r *Repository) CreateCategory(ctx context.Context, userID string, input CreateCategoryInput) (*Category, error) {
	slug := slugify(input.Name)

	const q = `
		INSERT INTO categories (user_id, name, description, slug)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, name, description, slug, is_active, created_at, updated_at`

	var cat Category
	err := r.db.GetContext(ctx, &cat, q,
		userID,
		input.Name,
		input.Description,
		slug,
	)
	if err != nil {
		// Check for unique constraint violation (duplicate slug for this user)
		// PostgreSQL error code 23505 = unique_violation
		if isUniqueViolation(err) {
			return nil, ErrDuplicateSlug
		}
		return nil, fmt.Errorf("create category: %w", err)
	}
	return &cat, nil
}

// UpdateCategory uses a dynamic SET clause because the input uses PATCH semantics —
// the client only sends fields they want to change.
//
// LEARNING NOTE — dynamic queries in Go:
//
//	We build the SET clause at runtime using a string builder.
//	This is safe because we never interpolate user data into the SQL string —
//	user values always go into the args slice and become $N placeholders.
//	SQL injection is impossible this way.
func (r *Repository) UpdateCategory(ctx context.Context, id, userID string, input UpdateCategoryInput) (*Category, error) {
	setClauses := []string{"updated_at = NOW()"}
	args := []interface{}{}
	argIdx := 1

	if input.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *input.Name)
		argIdx++

		// Also update the slug when name changes
		newSlug := slugify(*input.Name)
		setClauses = append(setClauses, fmt.Sprintf("slug = $%d", argIdx))
		args = append(args, newSlug)
		argIdx++
	}
	if input.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *input.Description)
		argIdx++
	}
	if input.IsActive != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, *input.IsActive)
		argIdx++
	}

	// WHERE clause: must be owned by this user (system categories can't be edited)
	args = append(args, id, userID)

	q := fmt.Sprintf(`
		UPDATE categories
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, name, description, slug, is_active, created_at, updated_at`,
		strings.Join(setClauses, ", "),
		argIdx, argIdx+1,
	)

	var cat Category
	if err := r.db.GetContext(ctx, &cat, q, args...); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound // not found OR not owned by user
		}
		return nil, fmt.Errorf("update category: %w", err)
	}
	return &cat, nil
}

// DeleteCategory soft-deletes by setting is_active = false.
// We never hard-delete categories because existing posts reference them.
func (r *Repository) DeleteCategory(ctx context.Context, id, userID string) error {
	const q = `
		UPDATE categories
		SET is_active = false, updated_at = NOW()
		WHERE id = $1 AND user_id = $2`

	res, err := r.db.ExecContext(ctx, q, id, userID)
	if err != nil {
		return fmt.Errorf("delete category: %w", err)
	}

	// RowsAffected tells us if the WHERE matched anything.
	// 0 rows = category not found OR not owned by this user.
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ══════════════════════════════════════════════════════════════
//  POST QUERIES
// ══════════════════════════════════════════════════════════════

// CreatePost inserts a new post and returns the full row.
// We use a transaction because we might need to do follow-up inserts
// (media), and we want everything to succeed or fail together.
func (r *Repository) CreatePost(ctx context.Context, userID string, input CreatePostInput, scheduledAt *time.Time) (*Post, error) {
	const q = `
		INSERT INTO posts (user_id, category_id, title, content, status, scheduled_at, platforms, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, category_id, title, content, status, scheduled_at, published_at,
		          platforms, metadata, deleted_at, created_at, updated_at`

	status := StatusDraft
	if scheduledAt != nil {
		status = StatusScheduled
	}

	meta := Metadata{}
	if input.Metadata != nil {
		meta = *input.Metadata
	}

	var post Post
	err := r.db.GetContext(ctx, &post, q,
		userID,
		input.CategoryID,
		input.Title,
		input.Content,
		status,
		scheduledAt,
		Platforms(input.Platforms), // cast to our custom type so Value() is called
		meta,
	)
	if err != nil {
		return nil, fmt.Errorf("create post: %w", err)
	}
	return &post, nil
}

// GetPostByID returns a post with its category and media.
// We use two queries rather than a complex JOIN with ARRAY_AGG because:
//  1. It's simpler to read and maintain
//  2. sqlx doesn't have built-in support for scanning nested slices from JOINs
//  3. Two indexed queries are still very fast (no N+1 — it's exactly 2 queries)
func (r *Repository) GetPostByID(ctx context.Context, id, userID string) (*Post, error) {
	const q = `
		SELECT p.id, p.user_id, p.category_id, p.title, p.content, p.status,
		       p.scheduled_at, p.published_at, p.platforms, p.metadata,
		       p.deleted_at, p.created_at, p.updated_at,
		       c.id        AS "category.id",
		       c.user_id   AS "category.user_id",
		       c.name      AS "category.name",
		       c.slug      AS "category.slug",
		       c.is_active AS "category.is_active",
		       c.created_at AS "category.created_at",
		       c.updated_at AS "category.updated_at"
		FROM posts p
		JOIN categories c ON c.id = p.category_id
		WHERE p.id = $1
		  AND p.user_id = $2
		  AND p.deleted_at IS NULL`

	// We use a flat struct for scanning then manually assemble the nested Category.
	// sqlx supports "." notation in column aliases to scan into embedded structs
	// when using StructScan — but GetContext with nested structs needs a flat scan.
	// This approach is explicit and works with all sqlx versions.
	type postRow struct {
		Post
		CatID        string    `db:"category.id"`
		CatUserID    *string   `db:"category.user_id"`
		CatName      string    `db:"category.name"`
		CatSlug      string    `db:"category.slug"`
		CatIsActive  bool      `db:"category.is_active"`
		CatCreatedAt time.Time `db:"category.created_at"`
		CatUpdatedAt time.Time `db:"category.updated_at"`
	}

	var row postRow
	if err := r.db.GetContext(ctx, &row, q, id, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get post: %w", err)
	}

	post := row.Post
	post.Category = &Category{
		ID:        row.CatID,
		UserID:    row.CatUserID,
		Name:      row.CatName,
		Slug:      row.CatSlug,
		IsActive:  row.CatIsActive,
		CreatedAt: row.CatCreatedAt,
		UpdatedAt: row.CatUpdatedAt,
	}

	// Second query: fetch media for this post
	media, err := r.GetPostMedia(ctx, id)
	if err != nil {
		return nil, err
	}
	post.Media = media

	return &post, nil
}

// ListPosts returns a paginated list of posts for a user.
//
// LEARNING NOTE — pagination with OFFSET:
//
//	OFFSET/LIMIT is simple and works well for small datasets.
//	For large datasets (millions of rows), keyset pagination
//	(WHERE created_at < $last_seen_created_at) is more efficient.
//	OFFSET is fine here for a typical SaaS product.
func (r *Repository) ListPosts(ctx context.Context, userID string, f ListPostsFilter) ([]*Post, int, error) {
	// Build dynamic WHERE clause
	conditions := []string{"p.user_id = $1", "p.deleted_at IS NULL"}
	args := []interface{}{userID}
	argIdx := 2

	if f.Status != nil {
		conditions = append(conditions, fmt.Sprintf("p.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}
	if f.CategoryID != nil {
		conditions = append(conditions, fmt.Sprintf("p.category_id = $%d", argIdx))
		args = append(args, *f.CategoryID)
		argIdx++
	}
	if f.Platform != nil {
		// JSONB @> operator: "does the platforms array contain this value?"
		// We pass a JSON array: '["linkedin"]'
		conditions = append(conditions, fmt.Sprintf("p.platforms @> $%d::jsonb", argIdx))
		args = append(args, fmt.Sprintf(`["%s"]`, *f.Platform))
		argIdx++
	}

	where := strings.Join(conditions, " AND ")

	// COUNT query: total matching rows (for pagination UI)
	countQ := fmt.Sprintf("SELECT COUNT(*) FROM posts p WHERE %s", where)
	var total int
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count posts: %w", err)
	}

	// Pagination defaults
	if f.PageSize <= 0 || f.PageSize > 100 {
		f.PageSize = 20
	}
	if f.Page <= 0 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.PageSize

	// Data query
	dataQ := fmt.Sprintf(`
		SELECT p.id, p.user_id, p.category_id, p.title, p.content, p.status,
		       p.scheduled_at, p.published_at, p.platforms, p.metadata,
		       p.deleted_at, p.created_at, p.updated_at
		FROM posts p
		WHERE %s
		ORDER BY p.created_at DESC
		LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1,
	)
	args = append(args, f.PageSize, offset)

	var posts []*Post
	if err := r.db.SelectContext(ctx, &posts, dataQ, args...); err != nil {
		return nil, 0, fmt.Errorf("list posts: %w", err)
	}

	return posts, total, nil
}

// UpdatePost — same dynamic SET pattern as UpdateCategory.
func (r *Repository) UpdatePost(ctx context.Context, id, userID string, input UpdatePostInput, scheduledAt *time.Time) (*Post, error) {
	setClauses := []string{"updated_at = NOW()"}
	args := []interface{}{}
	argIdx := 1

	if input.CategoryID != nil {
		setClauses = append(setClauses, fmt.Sprintf("category_id = $%d", argIdx))
		args = append(args, *input.CategoryID)
		argIdx++
	}
	if input.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *input.Title)
		argIdx++
	}
	if input.Content != nil {
		setClauses = append(setClauses, fmt.Sprintf("content = $%d", argIdx))
		args = append(args, *input.Content)
		argIdx++
	}
	if len(input.Platforms) > 0 {
		setClauses = append(setClauses, fmt.Sprintf("platforms = $%d", argIdx))
		args = append(args, Platforms(input.Platforms))
		argIdx++
	}
	if scheduledAt != nil {
		setClauses = append(setClauses, fmt.Sprintf("scheduled_at = $%d, status = 'scheduled'", argIdx))
		args = append(args, scheduledAt)
		argIdx++
	}
	if input.Metadata != nil {
		setClauses = append(setClauses, fmt.Sprintf("metadata = $%d", argIdx))
		args = append(args, *input.Metadata)
		argIdx++
	}

	args = append(args, id, userID)

	q := fmt.Sprintf(`
		UPDATE posts
		SET %s
		WHERE id = $%d AND user_id = $%d AND deleted_at IS NULL
		RETURNING id, user_id, category_id, title, content, status, scheduled_at,
		          published_at, platforms, metadata, deleted_at, created_at, updated_at`,
		strings.Join(setClauses, ", "),
		argIdx, argIdx+1,
	)

	var post Post
	if err := r.db.GetContext(ctx, &post, q, args...); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update post: %w", err)
	}
	return &post, nil
}

// DeletePost soft-deletes a post by setting deleted_at.
// All list queries filter WHERE deleted_at IS NULL so soft-deleted
// posts disappear from the UI while remaining in the database for audit.
func (r *Repository) DeletePost(ctx context.Context, id, userID string) error {
	const q = `
		UPDATE posts
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`

	res, err := r.db.ExecContext(ctx, q, id, userID)
	if err != nil {
		return fmt.Errorf("delete post: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ══════════════════════════════════════════════════════════════
//  MEDIA QUERIES
// ══════════════════════════════════════════════════════════════

func (r *Repository) GetPostMedia(ctx context.Context, postID string) ([]*PostMedia, error) {
	const q = `
		SELECT id, post_id, media_type, url, thumbnail_url, filename, file_size,
		       alt_text, duration_secs, width, height, display_order, created_at
		FROM post_media
		WHERE post_id = $1
		ORDER BY display_order ASC`

	var media []*PostMedia
	if err := r.db.SelectContext(ctx, &media, q, postID); err != nil {
		return nil, fmt.Errorf("get media: %w", err)
	}
	return media, nil
}

// AddMedia inserts a media file. We verify the post belongs to the user
// by joining back to posts — if the post doesn't exist or isn't theirs,
// the INSERT fails with a foreign key error which we surface as ErrNotFound.
func (r *Repository) AddMedia(ctx context.Context, postID, userID string, input AddMediaInput) (*PostMedia, error) {
	// First confirm the post belongs to this user
	const check = `SELECT 1 FROM posts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`
	var exists int
	if err := r.db.QueryRowContext(ctx, check, postID, userID).Scan(&exists); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("check post ownership: %w", err)
	}

	const q = `
		INSERT INTO post_media
		    (post_id, media_type, url, thumbnail_url, filename, file_size,
		     alt_text, duration_secs, width, height, display_order)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id, post_id, media_type, url, thumbnail_url, filename, file_size,
		          alt_text, duration_secs, width, height, display_order, created_at`

	var m PostMedia
	err := r.db.GetContext(ctx, &m, q,
		postID, input.MediaType, input.URL, input.ThumbnailURL, input.Filename,
		input.FileSize, input.AltText, input.DurationSecs, input.Width, input.Height,
		input.DisplayOrder,
	)
	if err != nil {
		return nil, fmt.Errorf("add media: %w", err)
	}
	return &m, nil
}

func (r *Repository) DeleteMedia(ctx context.Context, mediaID, postID, userID string) error {
	// JOIN to posts to enforce ownership in a single query
	const q = `
		DELETE FROM post_media
		WHERE post_media.id = $1
		  AND post_media.post_id = $2
		  AND EXISTS (
		      SELECT 1 FROM posts
		      WHERE posts.id = $2 AND posts.user_id = $3 AND posts.deleted_at IS NULL
		  )`

	res, err := r.db.ExecContext(ctx, q, mediaID, postID, userID)
	if err != nil {
		return fmt.Errorf("delete media: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ══════════════════════════════════════════════════════════════
//  PUBLISH RESULT QUERIES
// ══════════════════════════════════════════════════════════════

func (r *Repository) SavePublishResult(ctx context.Context, result *PublishResult) error {
	const q = `
		INSERT INTO post_publish_results (post_id, platform, status, platform_post_id, error_message)
		VALUES ($1, $2, $3, $4, $5)`

	_, err := r.db.ExecContext(ctx, q,
		result.PostID, result.Platform, result.Status, result.PlatformPostID, result.ErrorMessage,
	)
	return err
}

// UpdatePostStatus is called by the publisher worker after all platforms are attempted.
func (r *Repository) UpdatePostStatus(ctx context.Context, postID string, status PostStatus) error {
	var q string
	if status == StatusPublished {
		// Also record when it was published
		q = `UPDATE posts SET status = $1, published_at = NOW(), updated_at = NOW() WHERE id = $2`
	} else {
		q = `UPDATE posts SET status = $1, updated_at = NOW() WHERE id = $2`
	}
	_, err := r.db.ExecContext(ctx, q, status, postID)
	return err
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

// slugify converts "Written Post" → "written-post".
// Pure Go, no external dependency.
func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.TrimSpace(s)

	// Replace spaces and underscores with hyphens
	var b strings.Builder
	prevHyphen := false
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			prevHyphen = false
		case r == ' ' || r == '-' || r == '_':
			if !prevHyphen {
				b.WriteRune('-')
				prevHyphen = true
			}
		}
	}

	result := strings.Trim(b.String(), "-")
	return result
}

// isUniqueViolation checks if a PostgreSQL error is a unique constraint violation.
// We look for the SQLSTATE code "23505" in the error string.
// In production you'd use github.com/lib/pq and check pq.Error.Code == "23505".
func isUniqueViolation(err error) bool {
	return strings.Contains(err.Error(), "23505") ||
		strings.Contains(err.Error(), "unique_violation") ||
		strings.Contains(err.Error(), "unique constraint")
}
