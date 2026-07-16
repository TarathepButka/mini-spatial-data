package feature

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRegisterRoutesExposesFeaturesOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterRoutes(router.Group(""), NewHandler(nil), RoutePermissions{})

	routes := map[string]bool{}
	for _, route := range router.Routes() {
		routes[route.Method+" "+route.Path] = true
	}

	expectedRoutes := []string{
		"GET /collections",
		"GET /features",
		"GET /features/nearby",
		"GET /features/:id",
		"POST /features",
		"PUT /features/:id",
		"DELETE /features/:id",
	}
	for _, expected := range expectedRoutes {
		if !routes[expected] {
			t.Fatalf("expected route %s to be registered", expected)
		}
	}

	if len(routes) != len(expectedRoutes) {
		t.Fatalf("expected only feature routes, got %#v", routes)
	}
}
