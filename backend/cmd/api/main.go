package main

import (
	"log"
	"os"

	"github.com/zplus/pos/internal/config"
	"github.com/zplus/pos/internal/server"
	"github.com/zplus/pos/pkg/logger"
)

// @title Zplus POS API
// @version 1.0
// @description POS system with inventory management, warranty management, and sales management
// @host localhost:8080
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	appLogger := logger.New(cfg.App.Env)

	appLogger.Info().
		Str("app", cfg.App.Name).
		Str("version", cfg.App.Version).
		Str("env", cfg.App.Env).
		Msg("Starting application")

	// Create and initialize server
	srv := server.New(cfg, appLogger)
	if err := srv.Initialize(); err != nil {
		appLogger.Fatal().Err(err).Msg("Failed to initialize server")
		os.Exit(1)
	}

	// Start server
	if err := srv.Start(); err != nil {
		appLogger.Fatal().Err(err).Msg("Failed to start server")
		os.Exit(1)
	}
}
