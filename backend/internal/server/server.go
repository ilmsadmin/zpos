package server

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/zplus/pos/internal/config"
	"github.com/zplus/pos/internal/handler"
	"github.com/zplus/pos/internal/middleware"
	"github.com/zplus/pos/internal/repository"
	"github.com/zplus/pos/internal/repository/postgres"
	"github.com/zplus/pos/internal/router"
	"github.com/zplus/pos/internal/service"
	"github.com/zplus/pos/internal/validator"
	"github.com/zplus/pos/pkg/auth"
	"github.com/zplus/pos/pkg/database"
	"go.mongodb.org/mongo-driver/mongo"
)

type Server struct {
	app    *fiber.App
	config *config.Config
	log    zerolog.Logger
	pg     *pgxpool.Pool
	mongo  *mongo.Database
	redis  *goredis.Client
	jwt    *auth.JWTManager
}

func New(cfg *config.Config, log zerolog.Logger) *Server {
	return &Server{
		config: cfg,
		log:    log,
	}
}

func (s *Server) Initialize() error {
	// Initialize databases
	var err error

	s.log.Info().Msg("Connecting to PostgreSQL...")
	s.pg, err = database.NewPostgres(s.config.Postgres)
	if err != nil {
		return fmt.Errorf("failed to connect to PostgreSQL: %w", err)
	}
	s.log.Info().Msg("PostgreSQL connected")

	s.log.Info().Msg("Connecting to MongoDB...")
	s.mongo, err = database.NewMongoDB(s.config.MongoDB)
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}
	s.log.Info().Msg("MongoDB connected")

	s.log.Info().Msg("Connecting to Redis...")
	s.redis, err = database.NewRedis(s.config.Redis)
	if err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}
	s.log.Info().Msg("Redis connected")

	// Initialize JWT manager
	s.jwt = auth.NewJWTManager(auth.JWTConfig{
		SecretKey:        s.config.Auth.TokenSecret,
		AccessExpiresIn:  s.config.Auth.AccessTokenDuration,
		RefreshExpiresIn: s.config.Auth.RefreshTokenDuration,
		Issuer:           "zplus-pos",
	})

	// Create Fiber app
	s.app = fiber.New(fiber.Config{
		AppName:       "Zplus POS API",
		ReadTimeout:   10 * time.Second,
		WriteTimeout:  10 * time.Second,
		IdleTimeout:   120 * time.Second,
		BodyLimit:     10 * 1024 * 1024, // 10MB
		StrictRouting: false,
		CaseSensitive: false,
		ErrorHandler:  s.errorHandler,
	})

	// Setup middleware
	middleware.SetupMiddleware(s.app, s.log, s.config.App.AllowOrigins)

	// Initialize repositories
	userRepo := postgres.NewUserRepository(s.pg)
	roleRepo := postgres.NewRoleRepository(s.pg)
	storeRepo := postgres.NewStoreRepository(s.pg)
	categoryRepo := postgres.NewCategoryRepository(s.pg)
	productRepo := postgres.NewProductRepository(s.pg)
	variantRepo := postgres.NewProductVariantRepository(s.pg)
	inventoryRepo := postgres.NewInventoryRepository(s.pg)
	orderRepo := postgres.NewOrderRepository(s.pg)
	customerRepo := postgres.NewCustomerRepository(s.pg)
	supplierRepo := postgres.NewSupplierRepository(s.pg)
	warrantyRepo := postgres.NewWarrantyRepository(s.pg)
	posSessionRepo := postgres.NewPOSSessionRepository(s.pg)
	purchaseOrderRepo := postgres.NewPurchaseOrderRepository(s.pg)
	stocktakeRepo := postgres.NewStocktakeRepository(s.pg)
	notifRepo := repository.NewMongoNotificationRepository(s.mongo)

	// Initialize services
	validate := validator.New()

	notifSvc := service.NewNotificationService(notifRepo, userRepo, s.log)

	authSvc := service.NewAuthService(userRepo, roleRepo, s.jwt, s.log)
	userSvc := service.NewUserService(userRepo, roleRepo, s.jwt)
	roleSvc := service.NewRoleService(roleRepo)
	storeSvc := service.NewStoreService(storeRepo)
	categorySvc := service.NewCategoryService(categoryRepo)
	productSvc := service.NewProductService(productRepo, variantRepo, categoryRepo, inventoryRepo)
	inventorySvc := service.NewInventoryService(inventoryRepo, variantRepo)
	orderSvc := service.NewOrderService(orderRepo, inventoryRepo, variantRepo, customerRepo, productRepo, posSessionRepo, notifSvc)
	customerSvc := service.NewCustomerService(customerRepo, orderRepo, warrantyRepo)
	supplierSvc := service.NewSupplierService(supplierRepo, purchaseOrderRepo, variantRepo, productRepo)
	warrantySvc := service.NewWarrantyService(warrantyRepo, notifSvc)
	posSessionSvc := service.NewPOSSessionService(posSessionRepo, orderRepo, userRepo)
	purchaseOrderSvc := service.NewPurchaseOrderService(purchaseOrderRepo, supplierRepo, inventoryRepo, variantRepo, productRepo)
	stocktakeSvc := service.NewStocktakeService(stocktakeRepo, inventoryRepo, variantRepo)
	dashboardSvc := service.NewDashboardService(orderRepo, inventoryRepo, s.config)

	// Initialize handlers
	handlers := &router.Handlers{
		Auth:          handler.NewAuthHandler(authSvc, validate),
		User:          handler.NewUserHandler(userSvc, validate),
		Role:          handler.NewRoleHandler(roleSvc, validate),
		Store:         handler.NewStoreHandler(storeSvc, validate),
		Category:      handler.NewCategoryHandler(categorySvc, validate),
		Product:       handler.NewProductHandler(productSvc, validate),
		Order:         handler.NewOrderHandler(orderSvc, validate),
		Customer:      handler.NewCustomerHandler(customerSvc, validate),
		Supplier:      handler.NewSupplierHandler(supplierSvc, validate),
		Inventory:     handler.NewInventoryHandler(inventorySvc, validate),
		Warranty:      handler.NewWarrantyHandler(warrantySvc, validate),
		POSSession:    handler.NewPOSSessionHandler(posSessionSvc, validate),
		PurchaseOrder: handler.NewPurchaseOrderHandler(purchaseOrderSvc, validate),
		Stocktake:     handler.NewStocktakeHandler(stocktakeSvc, validate),
		Dashboard:     handler.NewDashboardHandler(dashboardSvc),
		Notification:  handler.NewNotificationHandler(notifSvc, validate),
	}

	// Initialize permission checker and setup routes
	permChecker := middleware.NewPermissionChecker(roleRepo)
	router.Setup(s.app, handlers, s.jwt, permChecker)

	s.log.Info().Msg("Server initialized successfully")

	return nil
}

func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.config.App.Port)
	s.log.Info().Int("port", s.config.App.Port).Str("env", s.config.App.Env).Msg("Starting server")

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		s.log.Info().Msg("Shutting down server...")
		s.Shutdown()
	}()

	return s.app.Listen(addr)
}

func (s *Server) Shutdown() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if s.pg != nil {
		s.pg.Close()
		s.log.Info().Msg("PostgreSQL connection closed")
	}
	if s.mongo != nil {
		_ = s.mongo.Client().Disconnect(ctx)
		s.log.Info().Msg("MongoDB connection closed")
	}
	if s.redis != nil {
		_ = s.redis.Close()
		s.log.Info().Msg("Redis connection closed")
	}
	if s.app != nil {
		_ = s.app.Shutdown()
	}
}

func (s *Server) errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	s.log.Error().Err(err).Int("status", code).Str("path", c.Path()).Msg("Request error")

	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error": fiber.Map{
			"code":    code,
			"message": message,
		},
	})
}
