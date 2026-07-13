package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const insecureDefaultAuthJWTSecret = "dev-only-change-this-secret"

type Config struct {
	AppEnv               string
	Port                 string
	MongoURI             string
	MongoDatabase        string
	MongoCollection      string
	MongoUsersCollection string
	AllowOrigins         []string
	GoogleClientID       string
	AuthJWTSecret        string
	AuthTokenTTL         time.Duration
	AuthRequired         bool
	AuthCookieName       string
	AuthCookieSecure     bool
	AuthCookieSameSite   string
	VallarisItemsURL     string
	VallarisAPIKey       string
	VallarisImportLimit  int
	HTTPTimeout          time.Duration
}

func Load() Config {
	appEnv := getenv("APP_ENV", "development")

	return Config{
		AppEnv:               appEnv,
		Port:                 getenv("PORT", "8080"),
		MongoURI:             getenv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDatabase:        getenv("MONGO_DATABASE", "mini_spatial_data"),
		MongoCollection:      getenv("MONGO_COLLECTION", "features"),
		MongoUsersCollection: getenv("MONGO_USERS_COLLECTION", "users"),
		AllowOrigins:         splitCSV(getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:5173")),
		GoogleClientID:       os.Getenv("GOOGLE_CLIENT_ID"),
		AuthJWTSecret:        strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET")),
		AuthTokenTTL:         time.Duration(getenvInt("AUTH_TOKEN_TTL_HOURS", 24)) * time.Hour,
		AuthRequired:         getenvBool("AUTH_REQUIRED", false),
		AuthCookieName:       getenv("AUTH_COOKIE_NAME", "mini_spatial_auth"),
		AuthCookieSecure:     getenvBool("AUTH_COOKIE_SECURE", strings.EqualFold(appEnv, "production")),
		AuthCookieSameSite:   getenv("AUTH_COOKIE_SAME_SITE", "lax"),
		VallarisItemsURL:     getenv("VALLARIS_ITEMS_URL", "https://app.vallarismaps.com/core/api/features/1.1/collections/68db604f6d325faa74ba5bbd/items"),
		VallarisAPIKey:       os.Getenv("VALLARIS_API_KEY"),
		VallarisImportLimit:  getenvInt("VALLARIS_IMPORT_LIMIT", 100),
		HTTPTimeout:          time.Duration(getenvInt("HTTP_TIMEOUT_SECONDS", 30)) * time.Second,
	}
}

func (cfg Config) Validate() error {
	if cfg.needsAuthSigningSecret() && !isSecureAuthJWTSecret(cfg.AuthJWTSecret) {
		return fmt.Errorf("AUTH_JWT_SECRET must be set to a private value with at least 32 characters when auth, Google login, or production mode is enabled")
	}

	return nil
}

func (cfg Config) needsAuthSigningSecret() bool {
	return cfg.AuthRequired ||
		strings.EqualFold(cfg.AppEnv, "production") ||
		strings.TrimSpace(cfg.GoogleClientID) != ""
}

func isSecureAuthJWTSecret(secret string) bool {
	secret = strings.TrimSpace(secret)
	if len(secret) < 32 {
		return false
	}

	insecureExamples := map[string]struct{}{
		insecureDefaultAuthJWTSecret:                 {},
		"change-me-to-at-least-32-random-characters": {},
		"replace-with-a-long-random-secret":          {},
	}
	_, insecure := insecureExamples[secret]

	return !insecure
}

func getenv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func getenvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getenvBool(key string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if value == "" {
		return fallback
	}

	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item != "" {
			items = append(items, item)
		}
	}

	return items
}
