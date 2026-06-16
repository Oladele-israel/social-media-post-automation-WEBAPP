// internal/posts/errors.go
package posts

// ─────────────────────────────────────────────────────────────────
//  SENTINEL ERRORS
// ─────────────────────────────────────────────────────────────────
// Sentinel errors are package-level error variables.
// The service and handler use errors.Is() to match them.
//
// WHY NOT JUST USE STRING ERRORS?
//   errors.Is() does an identity check — it's faster, type-safe,
//   and works correctly even when errors are wrapped with %w.
//   String comparison ("error message == ...") breaks the moment
//   someone adds context ("create post: not found").
// ─────────────────────────────────────────────────────────────────

import "errors"

var (
	// ErrNotFound is returned when a requested resource doesn't exist
	// OR when it exists but belongs to a different user (we deliberately
	// don't distinguish between "not found" and "forbidden" to avoid
	// leaking information about other users' data).
	ErrNotFound = errors.New("not found")

	// ErrDuplicateSlug is returned when a category slug already exists
	// within the same scope (system or user).
	ErrDuplicateSlug = errors.New("a category with this name already exists")

	// ErrCannotEditSystemCategory is returned when a user tries to
	// update or delete a built-in system category.
	ErrCannotEditSystemCategory = errors.New("system categories cannot be modified")

	// ErrPostNotDraft is returned when trying to do an operation that
	// is only valid on draft posts (e.g. scheduling an already-published post).
	ErrPostNotDraft = errors.New("post has already been published or cancelled")

	// ErrInvalidScheduleTime is returned when scheduled_at is in the past.
	ErrInvalidScheduleTime = errors.New("scheduled_at must be a future time")

	// ErrNoPlatforms is returned when a post has no target platforms.
	ErrNoPlatforms = errors.New("at least one platform must be selected")
)
