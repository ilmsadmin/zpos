package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	appErrors "github.com/zplus/pos/pkg/errors"
	"github.com/zplus/pos/pkg/response"
)

// Permission represents a specific permission string
type Permission string

// Define all available permissions
const (
	// User permissions
	PermUserRead   Permission = "users:read"
	PermUserCreate Permission = "users:create"
	PermUserUpdate Permission = "users:update"
	PermUserDelete Permission = "users:delete"

	// Product permissions
	PermProductRead   Permission = "products:read"
	PermProductCreate Permission = "products:create"
	PermProductUpdate Permission = "products:update"
	PermProductDelete Permission = "products:delete"

	// Inventory permissions
	PermInventoryRead   Permission = "inventory:read"
	PermInventoryUpdate Permission = "inventory:update"
	PermInventoryImport Permission = "inventory:import"
	PermInventoryExport Permission = "inventory:export"
	PermStocktake       Permission = "inventory:stocktake"

	// Order / POS permissions
	PermOrderRead   Permission = "orders:read"
	PermOrderCreate Permission = "orders:create"
	PermOrderUpdate Permission = "orders:update"
	PermOrderCancel Permission = "orders:cancel"
	PermOrderRefund Permission = "orders:refund"
	PermPOSAccess   Permission = "pos:access"
	PermPOSDiscount Permission = "pos:discount"

	// Customer permissions
	PermCustomerRead   Permission = "customers:read"
	PermCustomerCreate Permission = "customers:create"
	PermCustomerUpdate Permission = "customers:update"
	PermCustomerDelete Permission = "customers:delete"

	// Supplier permissions
	PermSupplierRead   Permission = "suppliers:read"
	PermSupplierCreate Permission = "suppliers:create"
	PermSupplierUpdate Permission = "suppliers:update"

	// Warranty permissions
	PermWarrantyRead   Permission = "warranties:read"
	PermWarrantyCreate Permission = "warranties:create"
	PermWarrantyUpdate Permission = "warranties:update"

	// Report permissions
	PermReportRead Permission = "reports:read"

	// Settings permissions
	PermSettingsRead   Permission = "settings:read"
	PermSettingsUpdate Permission = "settings:update"

	// Store permissions
	PermStoreRead   Permission = "stores:read"
	PermStoreUpdate Permission = "stores:update"
)

// PermissionChecker is an interface for checking user permissions
type PermissionChecker interface {
	HasPermission(roleID uuid.UUID, permission Permission) (bool, error)
	HasAnyPermission(roleID uuid.UUID, permissions ...Permission) (bool, error)
	HasAllPermissions(roleID uuid.UUID, permissions ...Permission) (bool, error)
}

// RequirePermission checks if the user has the required permission
func RequirePermission(checker PermissionChecker, perms ...Permission) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims := GetClaims(c)
		if claims == nil {
			return response.Error(c, appErrors.Unauthorized("Authentication required"))
		}

		// Super admin bypass
		if claims.RoleName == "super_admin" {
			return c.Next()
		}

		has, err := checker.HasAllPermissions(claims.RoleID, perms...)
		if err != nil {
			return response.Error(c, appErrors.Internal(err))
		}
		if !has {
			return response.Error(c, appErrors.Forbidden("Insufficient permissions"))
		}

		return c.Next()
	}
}

// RequireAnyPermission checks if the user has any of the required permissions
func RequireAnyPermission(checker PermissionChecker, perms ...Permission) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims := GetClaims(c)
		if claims == nil {
			return response.Error(c, appErrors.Unauthorized("Authentication required"))
		}

		if claims.RoleName == "super_admin" {
			return c.Next()
		}

		has, err := checker.HasAnyPermission(claims.RoleID, perms...)
		if err != nil {
			return response.Error(c, appErrors.Internal(err))
		}
		if !has {
			return response.Error(c, appErrors.Forbidden("Insufficient permissions"))
		}

		return c.Next()
	}
}

// RequireRole checks if the user has one of the specified roles
func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims := GetClaims(c)
		if claims == nil {
			return response.Error(c, appErrors.Unauthorized("Authentication required"))
		}

		for _, role := range roles {
			if claims.RoleName == role {
				return c.Next()
			}
		}

		return response.Error(c, appErrors.Forbidden("Role not authorized"))
	}
}
