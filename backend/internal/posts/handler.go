// internal/posts/handler.go
package posts

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/Oladele-israel/socialmedia-post-automation/internal/auth/providers"
	"github.com/Oladele-israel/socialmedia-post-automation/internal/middleware"
	"github.com/Oladele-israel/socialmedia-post-automation/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// Handler holds a reference to the service.
// Notice it does NOT hold a DB connection — HTTP handlers never touch the DB directly.
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Router registers all post-related routes.
// All routes are protected — mount this AFTER applying the auth middleware.
//
// Route design:
//
//	/categories                     → CRUD for categories
//	/posts                          → CRUD for posts
//	/posts/{id}/media               → media management
//	/posts/{id}/publish             → trigger publish
//	/posts/{id}/cancel              → cancel a scheduled post
func (h *Handler) Router(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware) // every route here requires a valid JWT

	// ── Categories ──────────────────────────────────────────────
	r.Get("/categories", h.ListCategories)
	r.Post("/categories", h.CreateCategory)
	r.Get("/categories/{id}", h.GetCategory)
	r.Patch("/categories/{id}", h.UpdateCategory)
	r.Delete("/categories/{id}", h.DeleteCategory)

	// ── Posts ────────────────────────────────────────────────────
	r.Get("/posts", h.ListPosts)
	r.Post("/posts", h.CreatePost)
	r.Get("/posts/{id}", h.GetPost)
	r.Patch("/posts/{id}", h.UpdatePost)
	r.Delete("/posts/{id}", h.DeletePost)

	// ── Media ─────TODO: visit later───────────────────────────────────────────────
	// r.Post("/posts/{id}/media", h.AddMedia)
	// r.Delete("/posts/{id}/media/{mediaID}", h.DeleteMedia)

	// ── Publish actions ──────────────────────────────────────────
	r.Post("/posts/{id}/publish", h.PublishPost)
	r.Post("/posts/{id}/cancel", h.CancelPost)

	return r
}

// ══════════════════════════════════════════════════════════════
//  CATEGORY HANDLERS
// ══════════════════════════════════════════════════════════════

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	cats, err := h.service.GetCategories(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch categories")
		return
	}

	respond(w, http.StatusOK, map[string]interface{}{
		"categories": cats,
		"total":      len(cats),
	})
}

func (h *Handler) GetCategory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	cat, err := h.service.GetCategoryByID(r.Context(), id, userID)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respond(w, http.StatusOK, cat)
}

func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	var input CreateCategoryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if errs := validator.Validate(input); errs != nil {
		respondValidationError(w, errs)
		return
	}

	cat, err := h.service.CreateCategory(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, ErrDuplicateSlug) {
			respondError(w, http.StatusConflict, err.Error())
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to create category")
		return
	}

	respond(w, http.StatusCreated, cat)
}

func (h *Handler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	var input UpdateCategoryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if errs := validator.Validate(input); errs != nil {
		respondValidationError(w, errs)
		return
	}

	cat, err := h.service.UpdateCategory(r.Context(), id, userID, input)
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respond(w, http.StatusOK, cat)
}

func (h *Handler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	if err := h.service.DeleteCategory(r.Context(), id, userID); err != nil {
		respondDomainError(w, err)
		return
	}

	respond(w, http.StatusOK, map[string]string{"message": "category deleted"})
}

// ══════════════════════════════════════════════════════════════
//  POST HANDLERS
// ══════════════════════════════════════════════════════════════

func (h *Handler) ListPosts(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	// Parse query parameters into a filter struct.
	// LEARNING NOTE:
	//   r.URL.Query() returns a url.Values map — all values are strings.
	//   We parse them manually here. In a larger project you might use
	//   a library like gorilla/schema to bind query params to a struct.
	q := r.URL.Query()
	f := ListPostsFilter{
		Page:     pageInt(q.Get("page"), 1),
		PageSize: pageInt(q.Get("page_size"), 20),
	}

	if s := q.Get("status"); s != "" {
		st := PostStatus(s)
		f.Status = &st
	}
	if c := q.Get("category_id"); c != "" {
		f.CategoryID = &c
	}
	if p := q.Get("platform"); p != "" {
		// Validate against known platforms
		if !isValidPlatform(providers.Platform(p)) {
			respondError(w, http.StatusBadRequest, fmt.Sprintf("unknown platform: %s", p))
			return
		}
		f.Platform = &p
	}

	page, err := h.service.ListPosts(r.Context(), userID, f)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch posts")
		return
	}

	respond(w, http.StatusOK, page)
}

func (h *Handler) CreatePost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	var input CreatePostInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if errs := validator.Validate(input); errs != nil {
		respondValidationError(w, errs)
		return
	}

	post, err := h.service.CreatePost(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, ErrInvalidScheduleTime) {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrNotFound) {
			respondError(w, http.StatusBadRequest, "category not found or not accessible")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to create post")
		return
	}

	respond(w, http.StatusCreated, post)
}

func (h *Handler) GetPost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	post, err := h.service.GetPost(r.Context(), id, userID)
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respond(w, http.StatusOK, post)
}

func (h *Handler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	var input UpdatePostInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if errs := validator.Validate(input); errs != nil {
		respondValidationError(w, errs)
		return
	}

	post, err := h.service.UpdatePost(r.Context(), id, userID, input)
	if err != nil {
		if errors.Is(err, ErrPostNotDraft) || errors.Is(err, ErrInvalidScheduleTime) {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		respondDomainError(w, err)
		return
	}

	respond(w, http.StatusOK, post)
}

func (h *Handler) DeletePost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	if err := h.service.DeletePost(r.Context(), id, userID); err != nil {
		respondDomainError(w, err)
		return
	}

	respond(w, http.StatusOK, map[string]string{"message": "post deleted"})
}

// ══════════════════════════════════════════════════════════════
//  MEDIA HANDLERS
// ══════════════════════════════════════════════════════════════

func (h *Handler) AddMedia(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	postID := chi.URLParam(r, "id")

	var input AddMediaInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if errs := validator.Validate(input); errs != nil {
		respondValidationError(w, errs)
		return
	}

	media, err := h.service.AddMedia(r.Context(), postID, userID, input)
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respond(w, http.StatusCreated, media)
}

func (h *Handler) DeleteMedia(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	postID := chi.URLParam(r, "id")
	mediaID := chi.URLParam(r, "mediaID")

	if err := h.service.DeleteMedia(r.Context(), mediaID, postID, userID); err != nil {
		respondDomainError(w, err)
		return
	}

	respond(w, http.StatusOK, map[string]string{"message": "media removed"})
}

// ══════════════════════════════════════════════════════════════
//  PUBLISH ACTION HANDLERS
// ══════════════════════════════════════════════════════════════

func (h *Handler) PublishPost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	post, err := h.service.PublishNow(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respondError(w, http.StatusNotFound, "post not found")
			return
		}
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 202 Accepted = "we got your request, processing is happening asynchronously"
	// This is more honest than 200 OK when publishing is done by a background worker.
	respond(w, http.StatusAccepted, map[string]interface{}{
		"message": "post queued for publishing",
		"post":    post,
	})
}

func (h *Handler) CancelPost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	post, err := h.service.CancelPost(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respondError(w, http.StatusNotFound, "post not found")
			return
		}
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respond(w, http.StatusOK, post)
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

// respondDomainError maps domain errors to HTTP status codes.
// Centralising this here means handler code stays clean.
func respondDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		respondError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, ErrCannotEditSystemCategory):
		respondError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, ErrDuplicateSlug):
		respondError(w, http.StatusConflict, err.Error())
	case errors.Is(err, ErrPostNotDraft):
		respondError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrInvalidScheduleTime):
		respondError(w, http.StatusBadRequest, err.Error())
	default:
		respondError(w, http.StatusInternalServerError, "internal server error")
	}
}

func respond(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respond(w, status, map[string]string{"error": msg})
}

func respondValidationError(w http.ResponseWriter, errs interface{}) {
	respond(w, http.StatusUnprocessableEntity, map[string]interface{}{
		"error":  "validation failed",
		"fields": errs,
	})
}

func isValidPlatform(p providers.Platform) bool {
	switch p {
	case providers.PlatformLinkedIn, providers.PlatformInstagram, providers.PlatformX:
		return true
	}
	return false
}

// pageInt parses a query param string as an integer, falling back to def.
func pageInt(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 {
		return def
	}
	return n
}
