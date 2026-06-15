// internal/auth/handler.go
package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Oladele-israel/socialmedia-post-automation/internal/auth/providers"
	"github.com/Oladele-israel/socialmedia-post-automation/internal/middleware"
	"github.com/Oladele-israel/socialmedia-post-automation/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Router defines every route in the auth domain
// main.go mounts this at /api/auth — it never sees individual routes
func (h *Handler) Router(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()

	// ── Public routes — no token needed ────────────────────────────
	r.Post("/register", h.Register)
	r.Post("/login", h.Login)
	r.Post("/refresh", h.Refresh)

	// LinkedIn callback is public because the user arrives here from
	// LinkedIn's website — they don't carry our JWT at that point.
	// Security is handled by the state parameter (CSRF token) instead.
	r.Get("/social/{platform}/callback", h.SocialCallback)

	// ── Protected routes — valid JWT required ──────────────────────
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)

		// Auth
		r.Post("/logout", h.Logout)
		r.Get("/me", h.Me)

		// Social OAuth — {platform} = linkedin | instagram | x | facebook
		r.Get("/social/{platform}/connect", h.SocialConnect)
		r.Get("/social/{platform}/profile", h.SocialProfile)
		r.Delete("/social/{platform}/disconnect", h.SocialDisconnect)

		// Get all connected social accounts for the logged-in user
		r.Get("/social", h.SocialAll)
	})

	return r
}

// ─────────────────────────────────────────
// Auth Handlers
// ─────────────────────────────────────────

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var input RegisterInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if errs := validator.Validate(input); errs != nil {
		respondValidationError(w, errs)
		return
	}

	result, err := h.service.Register(r.Context(), input)
	if err != nil {
		respondError(w, http.StatusConflict, err.Error())
		return
	}

	respond(w, http.StatusCreated, result)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var input LoginInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if errs := validator.Validate(input); errs != nil {
		respondValidationError(w, errs)
		return
	}

	result, err := h.service.Login(r.Context(), input.Email, input.Password)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	respond(w, http.StatusOK, result)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var input RefreshInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if errs := validator.Validate(input); errs != nil {
		respondValidationError(w, errs)
		return
	}

	result, err := h.service.RefreshTokens(r.Context(), input.RefreshToken)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	respond(w, http.StatusOK, result)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var input LogoutInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if errs := validator.Validate(input); errs != nil {
		respondValidationError(w, errs)
		return
	}

	tokenID := middleware.GetTokenID(r)
	tokenExpiry := middleware.GetTokenExpiry(r)
	remaining := time.Until(tokenExpiry)

	if err := h.service.Logout(r.Context(), input.RefreshToken, tokenID, remaining); err != nil {
		respondError(w, http.StatusInternalServerError, "logout failed")
		return
	}

	respond(w, http.StatusOK, map[string]string{
		"message": "logged out successfully",
	})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	user, err := h.service.repo.GetUserById(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	respond(w, http.StatusOK, user)
}

// ─────────────────────────────────────────
// Social OAuth Handlers
// ─────────────────────────────────────────

// SocialConnect generates the OAuth URL and redirects the user
// to the platform's authorization page.
//
// GET /api/auth/social/linkedin/connect
// GET /api/auth/social/instagram/connect
func (h *Handler) SocialConnect(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	platform := providers.Platform(chi.URLParam(r, "platform"))

	if !isValidPlatform(platform) {
		respondError(w, http.StatusBadRequest, fmt.Sprintf(
			"unsupported platform '%s'", platform,
		))
		return
	}

	authURL, err := h.service.GenerateAuthURL(r.Context(), userID, platform)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate auth URL")
		return
	}

	// Return the URL — frontend opens it in a popup
	respond(w, http.StatusOK, map[string]string{"url": authURL})
}

// SocialCallback handles the redirect back from the OAuth platform.
// LinkedIn / Instagram call this URL with ?code=xxx&state=xxx
// This route is PUBLIC — security is via the state CSRF token.
//
// GET /api/auth/social/linkedin/callback?code=xxx&state=xxx
func (h *Handler) SocialCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	oauthErr := r.URL.Query().Get("error")
	errDesc := r.URL.Query().Get("error_description")

	if oauthErr != "" {
		msg := "access denied"
		if errDesc != "" {
			msg = errDesc
		}
		h.writePopupResponse(w, false, msg)
		return
	}

	if code == "" || state == "" {
		h.writePopupResponse(w, false, "missing code or state parameter")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := h.service.HandleCallback(ctx, code, state); err != nil {
		fmt.Printf("oauth callback error: %v\n", err)
		h.writePopupResponse(w, false, "failed to complete OAuth flow")
		return
	}

	h.writePopupResponse(w, true, "")
}

// writePopupResponse sends a self-closing HTML page back to the popup window.
// On success it posts OAUTH_SUCCESS to the opener and closes itself.
// On error it posts OAUTH_ERROR so the opener can show the user a message.
func (h *Handler) writePopupResponse(w http.ResponseWriter, success bool, errMsg string) {
	var script string
	if success {
		script = `window.opener && window.opener.postMessage({ type: "OAUTH_SUCCESS" }, "*"); window.close();`
	} else {
		script = fmt.Sprintf(
			`window.opener && window.opener.postMessage({ type: "OAUTH_ERROR", error: %q }, "*"); window.close();`,
			errMsg,
		)
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Connecting…</title></head>
  <body>
    <p style="font-family:sans-serif;color:#6b7280;text-align:center;margin-top:40px">
      Connecting your account…
    </p>
    <script>%s</script>
  </body>
</html>`, script)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, html)
}

// SocialProfile returns the connected social account for a platform.
//
// GET /api/auth/social/linkedin/profile
func (h *Handler) SocialProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	platform := providers.Platform(chi.URLParam(r, "platform"))

	if !isValidPlatform(platform) {
		respondError(w, http.StatusBadRequest, fmt.Sprintf(
			"unsupported platform: %s", platform,
		))
		return
	}

	account, err := h.service.GetSocialProfile(r.Context(), userID, platform)
	if err != nil {
		respondError(w, http.StatusNotFound, fmt.Sprintf(
			"no %s account connected", platform,
		))
		return
	}

	respond(w, http.StatusOK, account)
}

// SocialDisconnect removes a connected social account.
//
// DELETE /api/auth/social/linkedin/disconnect
func (h *Handler) SocialDisconnect(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	platform := providers.Platform(chi.URLParam(r, "platform"))

	if !isValidPlatform(platform) {
		respondError(w, http.StatusBadRequest, fmt.Sprintf(
			"unsupported platform: %s", platform,
		))
		return
	}

	if err := h.service.DisconnectSocial(r.Context(), userID, platform); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf(
			"failed to disconnect %s account", platform,
		))
		return
	}

	respond(w, http.StatusOK, map[string]string{
		"message": fmt.Sprintf("%s account disconnected successfully", platform),
	})
}

// SocialAll returns all connected social accounts for the logged-in user.
//
// GET /api/auth/social
func (h *Handler) SocialAll(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	accounts, err := h.service.GetAllSocialProfiles(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch social accounts")
		return
	}

	// Return empty array not null when no accounts connected
	// null breaks frontend JavaScript — [] is always safe
	if accounts == nil {
		accounts = []*SocialAccount{}
	}

	respond(w, http.StatusOK, map[string]interface{}{
		"accounts": accounts,
		"total":    len(accounts),
	})
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

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

// isValidPlatform checks the URL param is a known platform
// before hitting the service layer — fast fail at the HTTP layer
func isValidPlatform(p providers.Platform) bool {
	switch p {
	case providers.PlatformLinkedIn,
		providers.PlatformInstagram,
		providers.PlatformX:
		return true
	}
	return false
}
