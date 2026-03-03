package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/zplus/pos/pkg/auth"
	appErrors "github.com/zplus/pos/pkg/errors"
	"github.com/zplus/pos/pkg/response"
)

const (
	AuthUserKey   = "auth_user"
	AuthClaimsKey = "auth_claims"
)

// AuthMiddleware validates JWT tokens from the Authorization header
func AuthMiddleware(jwtManager *auth.JWTManager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return response.Error(c, appErrors.Unauthorized("Missing authorization header"))
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return response.Error(c, appErrors.Unauthorized("Invalid authorization header format"))
		}

		claims, err := jwtManager.ValidateToken(parts[1], auth.AccessToken)
		if err != nil {
			if strings.Contains(err.Error(), "expired") {
				return response.Error(c, appErrors.TokenExpired())
			}
			return response.Error(c, appErrors.Unauthorized("Invalid or expired token"))
		}

		// Store claims in context
		c.Locals(AuthClaimsKey, claims)
		return c.Next()
	}
}

// OptionalAuth extracts token if present but doesn't require it
func OptionalAuth(jwtManager *auth.JWTManager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			claims, err := jwtManager.ValidateToken(parts[1], auth.AccessToken)
			if err == nil {
				c.Locals(AuthClaimsKey, claims)
			}
		}
		return c.Next()
	}
}

// GetClaims extracts JWT claims from the fiber context
func GetClaims(c *fiber.Ctx) *auth.Claims {
	claims, ok := c.Locals(AuthClaimsKey).(*auth.Claims)
	if !ok {
		return nil
	}
	return claims
}
