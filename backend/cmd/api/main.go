package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/auth"
	"github.com/example/mini-spatial-data/backend/internal/config"
	"github.com/example/mini-spatial-data/backend/internal/database"
	"github.com/example/mini-spatial-data/backend/internal/feature"
	apihttp "github.com/example/mini-spatial-data/backend/internal/http"
	"github.com/example/mini-spatial-data/backend/internal/seed"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	client, collection, err := database.Connect(ctx, cfg)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer func() {
		disconnectCtx, disconnectCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer disconnectCancel()
		if err := client.Disconnect(disconnectCtx); err != nil {
			log.Printf("disconnect database: %v", err)
		}
	}()

	featureRepository := feature.NewRepository(collection)
	if err := featureRepository.EnsureIndexes(ctx); err != nil {
		log.Fatalf("ensure indexes: %v", err)
	}

	featureService := feature.NewService(featureRepository)
	featureHandler := feature.NewHandler(featureService)
	seedHandler := seed.NewHandler(cfg, featureService)
	authService := auth.NewService(cfg)
	authHandler := auth.NewHandler(cfg, authService)

	router := apihttp.NewRouter(cfg, authHandler, featureHandler, seedHandler)
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("api listening on :%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server shutdown: %v", err)
	}
}
