package apihttp

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSMiddlewareWildcardDoesNotAllowCredentials(t *testing.T) {
	response := exerciseCORS([]string{"*"}, "https://evil.example")

	if response.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("expected public wildcard origin, got %q", response.Header().Get("Access-Control-Allow-Origin"))
	}
	if response.Header().Get("Access-Control-Allow-Credentials") != "" {
		t.Fatalf("wildcard origin must not allow credentials")
	}
}

func TestCORSMiddlewareExplicitOriginAllowsCredentials(t *testing.T) {
	response := exerciseCORS([]string{"https://app.example"}, "https://app.example")

	if response.Header().Get("Access-Control-Allow-Origin") != "https://app.example" {
		t.Fatalf("expected explicit origin, got %q", response.Header().Get("Access-Control-Allow-Origin"))
	}
	if response.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatalf("explicit origin should allow credentials")
	}
}

func exerciseCORS(allowedOrigins []string, origin string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORSMiddleware(allowedOrigins))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	request.Header.Set("Origin", origin)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}
