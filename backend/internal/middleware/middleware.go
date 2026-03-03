package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	fiberLogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/rs/zerolog"
)

// SetupMiddleware configures all global middleware
func SetupMiddleware(app *fiber.App, log zerolog.Logger, allowOrigins string) {
	// Recovery middleware
	app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))

	// Request ID
	app.Use(requestid.New())

	// CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Request-ID,X-Store-ID",
		AllowCredentials: true,
		MaxAge:           86400,
	}))

	// Logger
	app.Use(fiberLogger.New(fiberLogger.Config{
		Format:     "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path} | ${error}\n",
		TimeFormat: "2006-01-02 15:04:05",
		TimeZone:   "Asia/Ho_Chi_Minh",
	}))
}

// RateLimiter creates a rate limiter middleware
func RateLimiter(max int, expiration time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: expiration,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "RATE_LIMITED",
					"message": "Too many requests. Please try again later.",
				},
			})
		},
	})
}

// StrictRateLimiter for sensitive endpoints like login
func StrictRateLimiter() fiber.Handler {
	return RateLimiter(5, 1*time.Minute)
}

// NormalRateLimiter for general API endpoints
func NormalRateLimiter() fiber.Handler {
	return RateLimiter(100, 1*time.Minute)
}
