package apihttp

import (
	"net/http"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/auth"
	"github.com/example/mini-spatial-data/backend/internal/config"
	"github.com/example/mini-spatial-data/backend/internal/feature"
	"github.com/example/mini-spatial-data/backend/internal/seed"
	"github.com/gin-gonic/gin"
)

func NewRouter(cfg config.Config, authHandler *auth.Handler, featureHandler *feature.Handler, seedHandler *seed.Handler) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), CORSMiddleware(cfg.AllowOrigins))

	api := router.Group("/api/v1")
	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	auth.RegisterRoutes(api, authHandler)
	feature.RegisterRoutes(api, featureHandler, authHandler.RequireAuthIfEnabled())
	seed.RegisterRoutes(api, seedHandler, authHandler.RequireAuthIfEnabled())

	return router
}
