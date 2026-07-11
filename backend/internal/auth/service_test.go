package auth

import (
	"testing"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/config"
)

func TestIssueAndParseToken(t *testing.T) {
	service := NewService(config.Config{
		AuthJWTSecret: "test-secret",
		AuthTokenTTL:  time.Hour,
	})
	service.now = func() time.Time {
		return time.Date(2026, 7, 10, 0, 0, 0, 0, time.UTC)
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

	parsed, err := service.ParseToken(response.Token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if parsed.Email != user.Email || parsed.Subject != user.Subject {
		t.Fatalf("unexpected user: %#v", parsed)
	}
}
