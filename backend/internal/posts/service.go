// internal/posts/service.go
package posts

// ─────────────────────────────────────────────────────────────────
//  THE SERVICE LAYER
// ─────────────────────────────────────────────────────────────────
// The service owns all BUSINESS LOGIC:
//   • Validation beyond what struct tags can express (e.g. "is this a future date?")
//   • Authorization checks (e.g. "can this user edit this category?")
//   • Orchestrating multiple repository calls
//   • Deciding status transitions (draft → scheduled → published)
//
// The service NEVER talks to HTTP. It only knows about domain types.
// This means you could reuse the same service for a CLI, a gRPC API,
// or a background worker — the handler wires it to HTTP.
// ─────────────────────────────────────────────────────────────────

import (
	"context"
	"errors"
	"fmt"
	"time"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// ══════════════════════════════════════════════════════════════
//  CATEGORY METHODS
// ══════════════════════════════════════════════════════════════

func (s *Service) GetCategories(ctx context.Context, userID string) ([]*Category, error) {
	return s.repo.GetCategoriesForUser(ctx, userID)
}

func (s *Service) GetCategoryByID(ctx context.Context, id, userID string) (*Category, error) {
	cat, err := s.repo.GetCategoryByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Authorization: system categories (nil user_id) are visible to all.
	// User-owned categories are only visible to their owner.
	if cat.UserID != nil && *cat.UserID != userID {
		// Return ErrNotFound to avoid revealing the category exists for another user.
		return nil, ErrNotFound
	}

	return cat, nil
}

func (s *Service) CreateCategory(ctx context.Context, userID string, input CreateCategoryInput) (*Category, error) {
	return s.repo.CreateCategory(ctx, userID, input)
}

func (s *Service) UpdateCategory(ctx context.Context, id, userID string, input UpdateCategoryInput) (*Category, error) {
	// Fetch first to check if it's a system category
	cat, err := s.repo.GetCategoryByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// System categories (user_id IS NULL) are read-only for all users
	if cat.UserID == nil {
		return nil, ErrCannotEditSystemCategory
	}

	// Only the owner can edit their category
	if *cat.UserID != userID {
		return nil, ErrNotFound
	}

	return s.repo.UpdateCategory(ctx, id, userID, input)
}

func (s *Service) DeleteCategory(ctx context.Context, id, userID string) error {
	cat, err := s.repo.GetCategoryByID(ctx, id)
	if err != nil {
		return err
	}
	if cat.UserID == nil {
		return ErrCannotEditSystemCategory
	}
	return s.repo.DeleteCategory(ctx, id, userID)
}

// ══════════════════════════════════════════════════════════════
//  POST METHODS
// ══════════════════════════════════════════════════════════════

func (s *Service) CreatePost(ctx context.Context, userID string, input CreatePostInput) (*Post, error) {
	// 1. Validate the category exists and is accessible to this user
	_, err := s.GetCategoryByID(ctx, input.CategoryID, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, fmt.Errorf("category not found or not accessible")
		}
		return nil, err
	}

	// 2. Parse and validate scheduled_at
	var scheduledAt *time.Time
	if input.ScheduledAt != nil {
		t, err := time.Parse(time.RFC3339, *input.ScheduledAt)
		if err != nil {
			return nil, fmt.Errorf("invalid scheduled_at format: use RFC3339 (e.g. 2025-12-01T09:00:00Z)")
		}
		if t.Before(time.Now().Add(1 * time.Minute)) {
			return nil, ErrInvalidScheduleTime
		}
		scheduledAt = &t
	}

	return s.repo.CreatePost(ctx, userID, input, scheduledAt)
}

func (s *Service) GetPost(ctx context.Context, id, userID string) (*Post, error) {
	return s.repo.GetPostByID(ctx, id, userID)
}

func (s *Service) ListPosts(ctx context.Context, userID string, f ListPostsFilter) (*PostsPage, error) {
	posts, total, err := s.repo.ListPosts(ctx, userID, f)
	if err != nil {
		return nil, err
	}

	return &PostsPage{
		Posts:    posts,
		Total:    total,
		Page:     f.Page,
		PageSize: f.PageSize,
		HasMore:  (f.Page * f.PageSize) < total,
	}, nil
}

func (s *Service) UpdatePost(ctx context.Context, id, userID string, input UpdatePostInput) (*Post, error) {
	// Confirm the post exists and belongs to the user
	existing, err := s.repo.GetPostByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	// Can't edit a published or cancelled post
	if existing.Status == StatusPublished || existing.Status == StatusCancelled {
		return nil, ErrPostNotDraft
	}

	// Validate new category if provided
	if input.CategoryID != nil {
		if _, err := s.GetCategoryByID(ctx, *input.CategoryID, userID); err != nil {
			return nil, fmt.Errorf("category not found or not accessible")
		}
	}

	// Parse scheduled_at if provided
	var scheduledAt *time.Time
	if input.ScheduledAt != nil {
		t, err := time.Parse(time.RFC3339, *input.ScheduledAt)
		if err != nil {
			return nil, fmt.Errorf("invalid scheduled_at format")
		}
		if t.Before(time.Now().Add(1 * time.Minute)) {
			return nil, ErrInvalidScheduleTime
		}
		scheduledAt = &t
	}

	return s.repo.UpdatePost(ctx, id, userID, input, scheduledAt)
}

func (s *Service) DeletePost(ctx context.Context, id, userID string) error {
	return s.repo.DeletePost(ctx, id, userID)
}

// ── Media ─────────────────────────────────────────────────────

func (s *Service) AddMedia(ctx context.Context, postID, userID string, input AddMediaInput) (*PostMedia, error) {
	return s.repo.AddMedia(ctx, postID, userID, input)
}

func (s *Service) DeleteMedia(ctx context.Context, mediaID, postID, userID string) error {
	return s.repo.DeleteMedia(ctx, mediaID, postID, userID)
}

// ── Publish ───────────────────────────────────────────────────

// PublishNow immediately publishes a post to all its target platforms.
// In a real system this would enqueue a job to a worker (e.g. Redis queue or
// a background goroutine). For now it's a synchronous no-op placeholder
// that shows the correct structure.
//
// LEARNING NOTE — why not publish synchronously in the HTTP handler?
//
//	Calling LinkedIn/Instagram APIs can take 2–10 seconds.
//	If we do that inside an HTTP request the user's browser times out.
//	The correct pattern is: mark the post as "publishing", return 202 Accepted,
//	and let a background worker do the actual API calls and update the status.
func (s *Service) PublishNow(ctx context.Context, id, userID string) (*Post, error) {
	post, err := s.repo.GetPostByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	if post.Status == StatusPublished {
		return nil, fmt.Errorf("post is already published")
	}
	if post.Status == StatusCancelled {
		return nil, fmt.Errorf("post is cancelled and cannot be published")
	}

	// Mark as scheduled/publishing so the worker picks it up
	// In a full implementation: enqueue a job here
	if err := s.repo.UpdatePostStatus(ctx, id, StatusScheduled); err != nil {
		return nil, fmt.Errorf("failed to queue post for publishing: %w", err)
	}

	post.Status = StatusScheduled
	return post, nil
}

func (s *Service) CancelPost(ctx context.Context, id, userID string) (*Post, error) {
	post, err := s.repo.GetPostByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	if post.Status == StatusPublished {
		return nil, fmt.Errorf("cannot cancel a post that has already been published")
	}

	if err := s.repo.UpdatePostStatus(ctx, id, StatusCancelled); err != nil {
		return nil, err
	}

	post.Status = StatusCancelled
	return post, nil
}
