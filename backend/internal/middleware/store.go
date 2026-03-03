package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	appErrors "github.com/zplus/pos/pkg/errors"
	"github.com/zplus/pos/pkg/response"
)

const StoreIDKey = "store_id"

// StoreContext extracts and validates the X-Store-ID header
func StoreContext() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// First try from header
		storeIDStr := c.Get("X-Store-ID")

		// Then try from claims
		if storeIDStr == "" {
			claims := GetClaims(c)
			if claims != nil {
				storeIDStr = claims.StoreID.String()
			}
		}

		if storeIDStr == "" {
			return response.Error(c, appErrors.BadRequest("Store ID is required"))
		}

		storeID, err := uuid.Parse(storeIDStr)
		if err != nil {
			return response.Error(c, appErrors.BadRequest("Invalid store ID format"))
		}

		c.Locals(StoreIDKey, storeID)
		return c.Next()
	}
}

// GetStoreID extracts the store ID from the fiber context
func GetStoreID(c *fiber.Ctx) uuid.UUID {
	storeID, ok := c.Locals(StoreIDKey).(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return storeID
}
