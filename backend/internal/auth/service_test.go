package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/config"
	"github.com/gin-gonic/gin"
)

func TestIssueAndParseToken(t *testing.T) {
	service := NewService(config.Config{
		AuthJWTSecret: "test-secret",
		AuthTokenTTL:  time.Hour,
	}, nil)
	service.now = func() time.Time {
		return time.Now().UTC().Add(-time.Minute)
	}

	user := User{
		Subject:       "google-subject",
		Email:         "user@example.com",
		EmailVerified: true,
		Name:          "Example User",
	}

	response, err := service.IssueToken(user)
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	parsed, err := service.ParseToken(context.Background(), response.Token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}

	if parsed.Email != user.Email || parsed.Subject != user.Subject {
		t.Fatalf("unexpected user: %#v", parsed)
	}

	if parsed.Role != RoleUser {
		t.Fatalf("expected default role %q, got %q", RoleUser, parsed.Role)
	}

	if len(parsed.Roles) != 1 || parsed.Roles[0] != RoleUser {
		t.Fatalf("expected default roles, got %#v", parsed.Roles)
	}

	if !parsed.HasPermission(PermissionCreate) || parsed.HasPermission(PermissionSeed) {
		t.Fatalf("unexpected default permissions: %#v", parsed.Permissions)
	}
}

func TestParseTokenRefreshesRoleFromRepository(t *testing.T) {
	service := NewService(config.Config{
		AuthJWTSecret: "test-secret",
		AuthTokenTTL:  time.Hour,
	}, fakeUserRepository{
		findDocument: UserDocument{
			Email: "admin@example.com",
			Role:  RoleAdmin,
		},
	})

	response, err := service.IssueToken(User{
		Subject:       "google-subject",
		Email:         "admin@example.com",
		EmailVerified: true,
	})
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	user, err := service.ParseToken(context.Background(), response.Token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}

	if user.Role != RoleAdmin {
		t.Fatalf("expected admin role from repository, got %q", user.Role)
	}

	if !user.HasPermission(PermissionSeed) || !user.HasPermission(PermissionDelete) {
		t.Fatalf("expected admin permissions, got %#v", user.Permissions)
	}
}

func TestParseTokenPreservesActiveRoleWhenAvailable(t *testing.T) {
	service := NewService(config.Config{
		AuthJWTSecret: "test-secret",
		AuthTokenTTL:  time.Hour,
	}, fakeUserRepository{
		findDocument: UserDocument{
			Email: "admin@example.com",
			Role:  RoleAdmin,
			Roles: []Role{RoleAdmin, RoleUser},
		},
	})

	response, err := service.IssueToken(User{
		Subject:       "google-subject",
		Email:         "admin@example.com",
		EmailVerified: true,
		Role:          RoleUser,
		Roles:         []Role{RoleAdmin, RoleUser},
	})
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	user, err := service.ParseToken(context.Background(), response.Token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}

	if user.Role != RoleUser {
		t.Fatalf("expected active user role, got %q", user.Role)
	}

	if user.HasPermission(PermissionSeed) || user.HasPermission(PermissionDelete) {
		t.Fatalf("expected switched user permissions, got %#v", user.Permissions)
	}
}

func TestSwitchRoleAllowsAvailableRole(t *testing.T) {
	service := NewService(config.Config{
		AuthJWTSecret: "test-secret",
		AuthTokenTTL:  time.Hour,
	}, nil)

	response, err := service.SwitchRole(context.Background(), User{
		Subject:       "google-subject",
		Email:         "admin@example.com",
		EmailVerified: true,
		Role:          RoleAdmin,
		Roles:         []Role{RoleAdmin, RoleUser},
	}, RoleUser)
	if err != nil {
		t.Fatalf("switch role: %v", err)
	}

	if response.User.Role != RoleUser {
		t.Fatalf("expected active user role, got %q", response.User.Role)
	}

	if response.User.HasPermission(PermissionSeed) {
		t.Fatalf("expected user permissions after switch, got %#v", response.User.Permissions)
	}
}

func TestSwitchRoleRejectsUnavailableRole(t *testing.T) {
	service := NewService(config.Config{
		AuthJWTSecret: "test-secret",
		AuthTokenTTL:  time.Hour,
	}, nil)

	_, err := service.SwitchRole(context.Background(), User{
		Subject:       "google-subject",
		Email:         "user@example.com",
		EmailVerified: true,
		Role:          RoleUser,
		Roles:         []Role{RoleUser},
	}, RoleAdmin)
	if !errors.Is(err, ErrRoleNotAllowed) {
		t.Fatalf("expected role not allowed, got %v", err)
	}
}

func TestDefaultSeedUsersIncludesAdmin(t *testing.T) {
	if len(DefaultSeedUsers) != 1 {
		t.Fatalf("expected one default seed user, got %d", len(DefaultSeedUsers))
	}

	if DefaultSeedUsers[0].Email != "tarathep.butka@gmail.com" || DefaultSeedUsers[0].Role != RoleAdmin {
		t.Fatalf("unexpected default seed users: %#v", DefaultSeedUsers)
	}

	if !RoleAllowed(RoleAdmin, DefaultSeedUsers[0].Roles) || !RoleAllowed(RoleUser, DefaultSeedUsers[0].Roles) {
		t.Fatalf("expected admin seed user to have admin and user roles: %#v", DefaultSeedUsers[0])
	}
}

func TestRequirePermissionRejectsMissingPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, token := testAuthHandlerAndToken(t, User{
		Subject:       "google-subject",
		Email:         "user@example.com",
		EmailVerified: true,
		Role:          RoleUser,
	})

	router := gin.New()
	router.POST("/seed", handler.RequirePermission(PermissionSeed), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	request := httptest.NewRequest(http.MethodPost, "/seed", nil)
	request.AddCookie(&http.Cookie{Name: "mini_spatial_auth", Value: token})
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", response.Code)
	}
}

func TestRequirePermissionAllowsAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, token := testAuthHandlerAndToken(t, User{
		Subject:       "google-subject",
		Email:         "admin@example.com",
		EmailVerified: true,
		Role:          RoleAdmin,
	})

	router := gin.New()
	router.POST("/seed", handler.RequirePermission(PermissionSeed), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	request := httptest.NewRequest(http.MethodPost, "/seed", nil)
	request.AddCookie(&http.Cookie{Name: "mini_spatial_auth", Value: token})
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", response.Code)
	}
}

func testAuthHandlerAndToken(t *testing.T, user User) (*Handler, string) {
	t.Helper()

	cfg := config.Config{
		AuthJWTSecret:  "test-secret",
		AuthTokenTTL:   time.Hour,
		AuthCookieName: "mini_spatial_auth",
	}
	service := NewService(cfg, nil)
	response, err := service.IssueToken(user)
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	return NewHandler(cfg, service), response.Token
}

type fakeUserRepository struct {
	findDocument   UserDocument
	findErr        error
	upsertDocument UserDocument
	upsertErr      error
}

func (repository fakeUserRepository) FindByEmail(context.Context, string) (UserDocument, error) {
	if repository.findErr != nil {
		return UserDocument{}, repository.findErr
	}

	return repository.findDocument, nil
}

func (repository fakeUserRepository) UpsertLogin(context.Context, User) (UserDocument, error) {
	if repository.upsertErr != nil {
		return UserDocument{}, repository.upsertErr
	}

	if repository.upsertDocument.Email == "" && repository.findDocument.Email != "" {
		return repository.findDocument, nil
	}

	if repository.upsertDocument.Email == "" {
		return UserDocument{}, errors.New("missing fake upsert document")
	}

	return repository.upsertDocument, nil
}
