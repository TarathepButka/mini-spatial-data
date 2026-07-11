package auth

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/config"
	"github.com/gin-gonic/gin"
)

const userContextKey = "authUser"

type Handler struct {
	service        *Service
	authRequired   bool
	cookieName     string
	cookieSecure   bool
	cookieSameSite http.SameSite
}

func NewHandler(cfg config.Config, service *Service) *Handler {
	return &Handler{
		service:        service,
		authRequired:   cfg.AuthRequired,
		cookieName:     cfg.AuthCookieName,
		cookieSecure:   cfg.AuthCookieSecure,
		cookieSameSite: sameSiteMode(cfg.AuthCookieSameSite),
	}
}

func RegisterRoutes(router gin.IRouter, handler *Handler) {
	authGroup := router.Group("/auth")
	authGroup.POST("/google", handler.GoogleLogin)
	authGroup.POST("/logout", handler.Logout)
	authGroup.GET("/me", handler.RequireAuth(), handler.Me)
}

func (handler *Handler) GoogleLogin(c *gin.Context) {
	var request GoogleLoginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		writeAuthError(c, http.StatusBadRequest, "validation_error", "request body must include Google credential")
		return
	}

	response, err := handler.service.LoginWithGoogle(c.Request.Context(), request.Credential)
	if err != nil {
		status := http.StatusUnauthorized
		code := "invalid_google_credential"
		if errors.Is(err, ErrNotConfigured) {
			status = http.StatusBadRequest
			code = "google_login_not_configured"
		} else if errors.Is(err, ErrEmailUnverified) {
			status = http.StatusForbidden
			code = "email_not_verified"
		}
		writeAuthError(c, status, code, err.Error())
		return
	}

	handler.setAuthCookie(c, response)
	c.JSON(http.StatusOK, response)
}

func (handler *Handler) Logout(c *gin.Context) {
	handler.clearAuthCookie(c)
	c.JSON(http.StatusOK, gin.H{"loggedOut": true})
}

func (handler *Handler) Me(c *gin.Context) {
	user, ok := c.Get(userContextKey)
	if !ok {
		writeAuthError(c, http.StatusUnauthorized, "unauthorized", "authentication is required")
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (handler *Handler) RequireAuthIfEnabled() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !handler.authRequired {
			if user, err := handler.userFromRequest(c); err == nil {
				c.Set(userContextKey, user)
			}
			c.Next()
			return
		}
		handler.RequireAuth()(c)
	}
}

func (handler *Handler) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := handler.userFromRequest(c)
		if err != nil {
			writeAuthError(c, http.StatusUnauthorized, "unauthorized", "authentication is required")
			c.Abort()
			return
		}
		c.Set(userContextKey, user)
		c.Next()
	}
}

func (handler *Handler) userFromRequest(c *gin.Context) (User, error) {
	if cookieToken, err := c.Cookie(handler.cookieName); err == nil {
		return handler.service.ParseToken(cookieToken)
	}

	header := c.GetHeader("Authorization")
	token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	if token == header {
		return User{}, ErrInvalidToken
	}
	return handler.service.ParseToken(token)
}

func (handler *Handler) setAuthCookie(c *gin.Context, response AuthResponse) {
	maxAge := int(time.Until(parseExpiresAt(response.ExpiresAt)).Seconds())
	if maxAge <= 0 {
		maxAge = 1
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     handler.cookieName,
		Value:    response.Token,
		Path:     "/",
		Expires:  parseExpiresAt(response.ExpiresAt),
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   handler.cookieSecure,
		SameSite: handler.cookieSameSite,
	})
}

func (handler *Handler) clearAuthCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     handler.cookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-time.Hour),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   handler.cookieSecure,
		SameSite: handler.cookieSameSite,
	})
}

func parseExpiresAt(value string) time.Time {
	expiresAt, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Now().Add(24 * time.Hour)
	}
	return expiresAt
}

func sameSiteMode(value string) http.SameSite {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func writeAuthError(c *gin.Context, status int, code string, message string) {
	c.JSON(status, ErrorResponse{Error: ErrorBody{Code: code, Message: message}})
}
