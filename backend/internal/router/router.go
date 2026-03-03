package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/zplus/pos/internal/handler"
	"github.com/zplus/pos/internal/middleware"
	"github.com/zplus/pos/pkg/auth"
)

type Handlers struct {
	Auth          *handler.AuthHandler
	User          *handler.UserHandler
	Role          *handler.RoleHandler
	Store         *handler.StoreHandler
	Category      *handler.CategoryHandler
	Product       *handler.ProductHandler
	Order         *handler.OrderHandler
	Customer      *handler.CustomerHandler
	Supplier      *handler.SupplierHandler
	Inventory     *handler.InventoryHandler
	Warranty      *handler.WarrantyHandler
	POSSession    *handler.POSSessionHandler
	PurchaseOrder *handler.PurchaseOrderHandler
	Stocktake     *handler.StocktakeHandler
	Dashboard     *handler.DashboardHandler
}

func Setup(app *fiber.App, h *Handlers, jwtManager *auth.JWTManager, permChecker middleware.PermissionChecker) {
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "zplus-pos-api",
		})
	})

	// API v1
	api := app.Group("/api/v1")

	// Auth routes (public)
	authGroup := api.Group("/auth")
	authGroup.Post("/login", middleware.StrictRateLimiter(), h.Auth.Login)
	authGroup.Post("/register", middleware.StrictRateLimiter(), h.Auth.Register)
	authGroup.Post("/refresh", h.Auth.RefreshToken)

	// Auth routes (authenticated)
	authProtected := authGroup.Group("", middleware.AuthMiddleware(jwtManager))
	authProtected.Get("/profile", h.Auth.GetProfile)
	authProtected.Post("/change-password", h.Auth.ChangePassword)
	authProtected.Post("/logout", h.Auth.Logout)

	// Protected routes - require auth + store context
	protected := api.Group("",
		middleware.AuthMiddleware(jwtManager),
		middleware.StoreContext(),
	)

	// Dashboard routes
	dashboard := protected.Group("/dashboard")
	dashboard.Get("/summary", h.Dashboard.GetSummary)
	dashboard.Get("/sales-chart", h.Dashboard.GetSalesChart)
	dashboard.Get("/top-products", h.Dashboard.GetTopProducts)

	// User routes
	users := protected.Group("/users")
	users.Get("/", middleware.RequirePermission(permChecker, middleware.PermUserRead), h.User.List)
	users.Post("/", middleware.RequirePermission(permChecker, middleware.PermUserCreate), h.User.Create)
	users.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermUserRead), h.User.GetByID)
	users.Put("/:id", middleware.RequirePermission(permChecker, middleware.PermUserUpdate), h.User.Update)
	users.Delete("/:id", middleware.RequirePermission(permChecker, middleware.PermUserDelete), h.User.Delete)

	// Role routes
	roles := protected.Group("/roles")
	roles.Get("/", middleware.RequirePermission(permChecker, middleware.PermUserRead), h.Role.List)
	roles.Post("/", middleware.RequirePermission(permChecker, middleware.PermUserCreate), h.Role.Create)
	roles.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermUserRead), h.Role.GetByID)
	roles.Put("/:id", middleware.RequirePermission(permChecker, middleware.PermUserUpdate), h.Role.Update)
	roles.Delete("/:id", middleware.RequirePermission(permChecker, middleware.PermUserDelete), h.Role.Delete)

	// Store routes
	stores := protected.Group("/stores")
	stores.Get("/", middleware.RequirePermission(permChecker, middleware.PermStoreRead), h.Store.GetAll)
	stores.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermStoreRead), h.Store.GetByID)
	stores.Put("/:id", middleware.RequirePermission(permChecker, middleware.PermStoreUpdate), h.Store.Update)

	// Category routes
	categories := protected.Group("/categories")
	categories.Get("/", middleware.RequirePermission(permChecker, middleware.PermProductRead), h.Category.GetTree)
	categories.Post("/", middleware.RequirePermission(permChecker, middleware.PermProductCreate), h.Category.Create)
	categories.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermProductRead), h.Category.GetByID)
	categories.Put("/:id", middleware.RequirePermission(permChecker, middleware.PermProductUpdate), h.Category.Update)
	categories.Delete("/:id", middleware.RequirePermission(permChecker, middleware.PermProductDelete), h.Category.Delete)

	// Product routes
	products := protected.Group("/products")
	products.Get("/", middleware.RequirePermission(permChecker, middleware.PermProductRead), h.Product.List)
	products.Post("/", middleware.RequirePermission(permChecker, middleware.PermProductCreate), h.Product.Create)
	products.Get("/search", middleware.RequirePermission(permChecker, middleware.PermProductRead), h.Product.Search)
	products.Get("/barcode/:barcode", middleware.RequirePermission(permChecker, middleware.PermProductRead), h.Product.GetByBarcode)
	products.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermProductRead), h.Product.GetByID)
	products.Put("/:id", middleware.RequirePermission(permChecker, middleware.PermProductUpdate), h.Product.Update)
	products.Delete("/:id", middleware.RequirePermission(permChecker, middleware.PermProductDelete), h.Product.Delete)

	// Product variant routes
	products.Post("/:id/variants", middleware.RequirePermission(permChecker, middleware.PermProductCreate), h.Product.CreateVariant)
	products.Put("/:id/variants/:variantId", middleware.RequirePermission(permChecker, middleware.PermProductUpdate), h.Product.UpdateVariant)
	products.Delete("/:id/variants/:variantId", middleware.RequirePermission(permChecker, middleware.PermProductDelete), h.Product.DeleteVariant)

	// Order routes
	orders := protected.Group("/orders")
	orders.Get("/", middleware.RequirePermission(permChecker, middleware.PermOrderRead), h.Order.List)
	orders.Post("/", middleware.RequireAnyPermission(permChecker, middleware.PermOrderCreate, middleware.PermPOSAccess), h.Order.Create)
	orders.Get("/daily-summary", middleware.RequirePermission(permChecker, middleware.PermReportRead), h.Order.DailySummary)
	orders.Get("/customer/:customer_id/items", middleware.RequirePermission(permChecker, middleware.PermOrderRead), h.Order.GetCustomerPurchasedItems)
	orders.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermOrderRead), h.Order.GetByID)
	orders.Post("/:id/cancel", middleware.RequirePermission(permChecker, middleware.PermOrderCancel), h.Order.Cancel)
	orders.Post("/:id/refund", middleware.RequirePermission(permChecker, middleware.PermOrderRefund), h.Order.Refund)

	// Customer routes
	customers := protected.Group("/customers")
	customers.Get("/", middleware.RequirePermission(permChecker, middleware.PermCustomerRead), h.Customer.List)
	customers.Post("/", middleware.RequirePermission(permChecker, middleware.PermCustomerCreate), h.Customer.Create)
	customers.Get("/search", middleware.RequirePermission(permChecker, middleware.PermCustomerRead), h.Customer.Search)
	customers.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermCustomerRead), h.Customer.GetByID)
	customers.Put("/:id", middleware.RequirePermission(permChecker, middleware.PermCustomerUpdate), h.Customer.Update)
	customers.Delete("/:id", middleware.RequirePermission(permChecker, middleware.PermCustomerDelete), h.Customer.Delete)
	customers.Get("/:id/orders", middleware.RequirePermission(permChecker, middleware.PermCustomerRead), h.Customer.GetOrders)
	customers.Get("/:id/warranties", middleware.RequirePermission(permChecker, middleware.PermCustomerRead), h.Customer.GetWarranties)

	// Supplier routes
	suppliers := protected.Group("/suppliers")
	suppliers.Get("/", middleware.RequirePermission(permChecker, middleware.PermSupplierRead), h.Supplier.List)
	suppliers.Post("/", middleware.RequirePermission(permChecker, middleware.PermSupplierCreate), h.Supplier.Create)
	suppliers.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermSupplierRead), h.Supplier.GetByID)
	suppliers.Put("/:id", middleware.RequirePermission(permChecker, middleware.PermSupplierUpdate), h.Supplier.Update)
	suppliers.Delete("/:id", middleware.RequirePermission(permChecker, middleware.PermSupplierRead), h.Supplier.Delete)

	// Inventory routes
	inventory := protected.Group("/inventory")
	inventory.Get("/low-stock", middleware.RequirePermission(permChecker, middleware.PermInventoryRead), h.Inventory.GetLowStock)
	inventory.Post("/adjust", middleware.RequirePermission(permChecker, middleware.PermInventoryUpdate), h.Inventory.Adjust)
	inventory.Post("/adjust/bulk", middleware.RequirePermission(permChecker, middleware.PermInventoryUpdate), h.Inventory.BulkAdjust)
	inventory.Get("/:variant_id", middleware.RequirePermission(permChecker, middleware.PermInventoryRead), h.Inventory.GetByVariant)
	inventory.Get("/:variant_id/movements", middleware.RequirePermission(permChecker, middleware.PermInventoryRead), h.Inventory.GetMovements)

	// Warranty routes
	warranties := protected.Group("/warranties")
	warranties.Get("/", middleware.RequirePermission(permChecker, middleware.PermWarrantyRead), h.Warranty.List)
	warranties.Post("/", middleware.RequirePermission(permChecker, middleware.PermWarrantyCreate), h.Warranty.Create)
	warranties.Get("/lookup", middleware.RequirePermission(permChecker, middleware.PermWarrantyRead), h.Warranty.Lookup)
	warranties.Get("/expiring", middleware.RequirePermission(permChecker, middleware.PermWarrantyRead), h.Warranty.GetExpiring)
	warranties.Get("/claims-count", middleware.RequirePermission(permChecker, middleware.PermWarrantyRead), h.Warranty.CountActiveClaims)
	warranties.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermWarrantyRead), h.Warranty.GetByID)
	warranties.Put("/:id", middleware.RequirePermission(permChecker, middleware.PermWarrantyUpdate), h.Warranty.Update)
	warranties.Post("/:id/void", middleware.RequirePermission(permChecker, middleware.PermWarrantyUpdate), h.Warranty.Void)
	warranties.Post("/:id/claims", middleware.RequirePermission(permChecker, middleware.PermWarrantyCreate), h.Warranty.CreateClaim)

	// Warranty claim routes
	warrantyClaims := protected.Group("/warranty-claims")
	warrantyClaims.Get("/:claim_id", middleware.RequirePermission(permChecker, middleware.PermWarrantyRead), h.Warranty.GetClaimByID)
	warrantyClaims.Put("/:claim_id", middleware.RequirePermission(permChecker, middleware.PermWarrantyUpdate), h.Warranty.UpdateClaim)
	warrantyClaims.Put("/:claim_id/status", middleware.RequirePermission(permChecker, middleware.PermWarrantyUpdate), h.Warranty.UpdateClaimStatus)
	warrantyClaims.Post("/:claim_id/return", middleware.RequirePermission(permChecker, middleware.PermWarrantyUpdate), h.Warranty.ReturnClaim)

	// POS session routes
	pos := protected.Group("/pos")
	pos.Post("/sessions/open", middleware.RequirePermission(permChecker, middleware.PermPOSAccess), h.POSSession.Open)
	pos.Get("/sessions/current", middleware.RequirePermission(permChecker, middleware.PermPOSAccess), h.POSSession.GetCurrent)
	pos.Get("/sessions", middleware.RequirePermission(permChecker, middleware.PermPOSAccess), h.POSSession.List)
	pos.Post("/sessions/:id/close", middleware.RequirePermission(permChecker, middleware.PermPOSAccess), h.POSSession.Close)

	// Purchase order routes
	purchaseOrders := protected.Group("/purchase-orders")
	purchaseOrders.Get("/", middleware.RequirePermission(permChecker, middleware.PermInventoryRead), h.PurchaseOrder.List)
	purchaseOrders.Post("/", middleware.RequirePermission(permChecker, middleware.PermInventoryImport), h.PurchaseOrder.Create)
	purchaseOrders.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermInventoryRead), h.PurchaseOrder.GetByID)
	purchaseOrders.Put("/:id", middleware.RequirePermission(permChecker, middleware.PermInventoryUpdate), h.PurchaseOrder.Update)
	purchaseOrders.Post("/:id/approve", middleware.RequirePermission(permChecker, middleware.PermInventoryUpdate), h.PurchaseOrder.Approve)
	purchaseOrders.Post("/:id/receive", middleware.RequirePermission(permChecker, middleware.PermInventoryImport), h.PurchaseOrder.Receive)

	// Stocktake routes
	stocktakes := protected.Group("/stocktakes")
	stocktakes.Get("/", middleware.RequirePermission(permChecker, middleware.PermStocktake), h.Stocktake.List)
	stocktakes.Post("/", middleware.RequirePermission(permChecker, middleware.PermStocktake), h.Stocktake.Create)
	stocktakes.Get("/:id", middleware.RequirePermission(permChecker, middleware.PermStocktake), h.Stocktake.GetByID)
	stocktakes.Post("/:id/count", middleware.RequirePermission(permChecker, middleware.PermStocktake), h.Stocktake.AddItem)
	stocktakes.Post("/:id/complete", middleware.RequirePermission(permChecker, middleware.PermStocktake), h.Stocktake.Complete)
}
