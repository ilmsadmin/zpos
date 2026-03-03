package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
)

// AuthService defines the interface for authentication operations
type AuthService interface {
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error)
	Register(ctx context.Context, storeID uuid.UUID, req *dto.RegisterRequest) (*dto.UserResponse, error)
	RefreshToken(ctx context.Context, req *dto.RefreshTokenRequest) (*dto.LoginResponse, error)
	ChangePassword(ctx context.Context, userID uuid.UUID, req *dto.ChangePasswordRequest) error
	GetProfile(ctx context.Context, userID uuid.UUID) (*dto.UserResponse, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req *dto.UpdateProfileRequest) (*dto.UserResponse, error)
	Logout(ctx context.Context, userID uuid.UUID) error
}

// UserService defines the interface for user management operations
type UserService interface {
	Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateUserRequest) (*dto.UserResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.UserResponse, error)
	List(ctx context.Context, storeID uuid.UUID, page, limit int) ([]dto.UserResponse, int64, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateUserRequest) (*dto.UserResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// RoleService defines the interface for role management
type RoleService interface {
	Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateRoleRequest) (*dto.RoleResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.RoleResponse, error)
	List(ctx context.Context, storeID uuid.UUID) ([]dto.RoleResponse, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateRoleRequest) (*dto.RoleResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// StoreService defines the interface for store management
type StoreService interface {
	GetByID(ctx context.Context, id uuid.UUID) (*dto.StoreResponse, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateStoreRequest) (*dto.StoreResponse, error)
	GetAll(ctx context.Context) ([]dto.StoreResponse, error)
}

// CategoryService defines the interface for category operations
type CategoryService interface {
	Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateCategoryRequest) (*dto.CategoryResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.CategoryResponse, error)
	GetTree(ctx context.Context, storeID uuid.UUID) ([]dto.CategoryResponse, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateCategoryRequest) (*dto.CategoryResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// ProductService defines the interface for product operations
type ProductService interface {
	Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateProductRequest) (*dto.ProductResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.ProductResponse, error)
	List(ctx context.Context, storeID uuid.UUID, params *dto.ProductListParams) ([]dto.ProductResponse, int64, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateProductRequest) (*dto.ProductResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Search(ctx context.Context, storeID uuid.UUID, query string, limit int) ([]dto.ProductResponse, error)
	// Variant operations
	CreateVariant(ctx context.Context, productID uuid.UUID, req *dto.CreateVariantRequest) (*dto.VariantResponse, error)
	UpdateVariant(ctx context.Context, id uuid.UUID, req *dto.UpdateVariantRequest) (*dto.VariantResponse, error)
	DeleteVariant(ctx context.Context, id uuid.UUID) error
	GetByBarcode(ctx context.Context, barcode string) (*dto.ProductResponse, error)
}

// InventoryService defines the interface for inventory operations
type InventoryService interface {
	GetByVariant(ctx context.Context, storeID, variantID uuid.UUID) (*dto.InventoryResponse, error)
	AdjustStock(ctx context.Context, storeID, userID uuid.UUID, req *dto.AdjustInventoryRequest) error
	BulkAdjust(ctx context.Context, storeID, userID uuid.UUID, req *dto.BulkAdjustInventoryRequest) error
	GetLowStock(ctx context.Context, storeID uuid.UUID, page, limit int) ([]dto.InventoryResponse, int64, error)
	GetMovements(ctx context.Context, storeID, variantID uuid.UUID, page, limit int) ([]interface{}, int64, error)
}

// OrderService defines the interface for order/POS operations
type OrderService interface {
	Create(ctx context.Context, storeID, userID uuid.UUID, req *dto.CreateOrderRequest) (*dto.OrderResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.OrderResponse, error)
	List(ctx context.Context, storeID uuid.UUID, params *dto.OrderListParams) ([]dto.OrderResponse, int64, error)
	Cancel(ctx context.Context, id uuid.UUID, reason string) error
	Refund(ctx context.Context, id uuid.UUID, reason string) error
	GetDailySummary(ctx context.Context, storeID uuid.UUID, date string) (map[string]interface{}, error)
	GetCustomerPurchasedItems(ctx context.Context, storeID, customerID uuid.UUID) ([]dto.CustomerPurchasedItemResponse, error)
}

// CustomerService defines the interface for customer management
type CustomerService interface {
	Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateCustomerRequest) (*dto.CustomerResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.CustomerResponse, error)
	List(ctx context.Context, storeID uuid.UUID, params *dto.CustomerListParams) ([]dto.CustomerResponse, int64, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateCustomerRequest) (*dto.CustomerResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Search(ctx context.Context, storeID uuid.UUID, query string) ([]dto.CustomerResponse, error)
	GetOrders(ctx context.Context, customerID uuid.UUID, page, limit int) ([]dto.OrderResponse, int64, error)
	GetWarranties(ctx context.Context, customerID uuid.UUID, page, limit int) ([]dto.WarrantyResponse, int64, error)
}

// SupplierService defines the interface for supplier management
type SupplierService interface {
	Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateSupplierRequest) (*dto.SupplierResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.SupplierResponse, error)
	List(ctx context.Context, storeID uuid.UUID, page, limit int, search string) ([]dto.SupplierResponse, int64, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateSupplierRequest) (*dto.SupplierResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetPurchaseOrders(ctx context.Context, storeID, supplierID uuid.UUID, page, limit int) ([]dto.PurchaseOrderResponse, int64, error)
	GetDebtSummary(ctx context.Context, storeID, supplierID uuid.UUID) (*dto.SupplierDebtSummary, error)
}

// WarrantyService defines the interface for warranty operations
type WarrantyService interface {
	Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateWarrantyRequest) (*dto.WarrantyResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.WarrantyResponse, error)
	GetByCode(ctx context.Context, code string) (*dto.WarrantyResponse, error)
	List(ctx context.Context, storeID uuid.UUID, params *dto.WarrantyListParams) ([]dto.WarrantyResponse, int64, error)
	GetExpiring(ctx context.Context, storeID uuid.UUID, days int, page, limit int) ([]dto.WarrantyResponse, int64, error)
	CountActiveClaims(ctx context.Context, storeID uuid.UUID) (int64, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateWarrantyRequest) (*dto.WarrantyResponse, error)
	Void(ctx context.Context, id uuid.UUID) error
	Lookup(ctx context.Context, query string) ([]dto.WarrantyResponse, error)
	PublicLookup(ctx context.Context, query string) ([]dto.PublicWarrantyResponse, error)
	CreateClaim(ctx context.Context, warrantyID, userID uuid.UUID, req *dto.CreateWarrantyClaimRequest) (*dto.WarrantyClaimResponse, error)
	GetClaimByID(ctx context.Context, claimID uuid.UUID) (*dto.WarrantyClaimResponse, error)
	UpdateClaim(ctx context.Context, claimID uuid.UUID, req *dto.UpdateWarrantyClaimRequest) (*dto.WarrantyClaimResponse, error)
	UpdateClaimStatus(ctx context.Context, claimID uuid.UUID, status string) (*dto.WarrantyClaimResponse, error)
	ReturnClaim(ctx context.Context, claimID uuid.UUID, notes string) (*dto.WarrantyClaimResponse, error)
	CheckWarranty(ctx context.Context, code string) (*dto.WarrantyResponse, error)
}

// POSSessionService defines the interface for POS session management
type POSSessionService interface {
	Open(ctx context.Context, storeID, userID uuid.UUID, req *dto.OpenPOSSessionRequest) (*dto.POSSessionResponse, error)
	Close(ctx context.Context, sessionID uuid.UUID, req *dto.ClosePOSSessionRequest) (*dto.POSSessionResponse, error)
	GetCurrent(ctx context.Context, storeID, userID uuid.UUID) (*dto.POSSessionResponse, error)
	List(ctx context.Context, storeID uuid.UUID, page, limit int) ([]dto.POSSessionResponse, int64, error)
}

// PurchaseOrderService defines the interface for purchase order operations
type PurchaseOrderService interface {
	Create(ctx context.Context, storeID, userID uuid.UUID, req *dto.CreatePurchaseOrderRequest) (*dto.PurchaseOrderResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.PurchaseOrderResponse, error)
	List(ctx context.Context, storeID uuid.UUID, page, limit int, status string) ([]dto.PurchaseOrderResponse, int64, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdatePurchaseOrderRequest) (*dto.PurchaseOrderResponse, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	Receive(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.ReceivePurchaseOrderRequest) (*dto.PurchaseOrderResponse, error)
}

// StocktakeService defines the interface for stocktake operations
type StocktakeService interface {
	Create(ctx context.Context, storeID, userID uuid.UUID, req *dto.CreateStocktakeRequest) (*dto.StocktakeResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.StocktakeResponse, error)
	List(ctx context.Context, storeID uuid.UUID, params *dto.StocktakeListParams) ([]dto.StocktakeResponse, int64, error)
	AddItem(ctx context.Context, stocktakeID uuid.UUID, req *dto.AddStocktakeItemRequest) (*dto.StocktakeItemResponse, error)
	UpdateItem(ctx context.Context, stocktakeID, itemID uuid.UUID, req *dto.UpdateStocktakeItemRequest) (*dto.StocktakeItemResponse, error)
	DeleteItem(ctx context.Context, stocktakeID, itemID uuid.UUID) error
	Complete(ctx context.Context, id uuid.UUID) (*dto.StocktakeResponse, error)
	Cancel(ctx context.Context, id uuid.UUID) (*dto.StocktakeResponse, error)
	AddItemByBarcode(ctx context.Context, stocktakeID uuid.UUID, barcode string, countedQty int) (*dto.StocktakeItemResponse, error)
}

// DashboardService defines the interface for dashboard and reporting
type DashboardService interface {
	GetSummary(ctx context.Context, storeID uuid.UUID) (*dto.DashboardSummary, error)
	GetSalesChart(ctx context.Context, storeID uuid.UUID, period string, days int) ([]dto.SalesChartPoint, error)
	GetTopProducts(ctx context.Context, storeID uuid.UUID, limit int) ([]dto.TopProductItem, error)
}

// NotificationService defines the interface for notification operations
type NotificationService interface {
	List(ctx context.Context, storeID, userID uuid.UUID, params *dto.NotificationListParams) ([]dto.NotificationResponse, int64, error)
	GetUnreadCount(ctx context.Context, storeID, userID uuid.UUID) (int64, error)
	MarkAsRead(ctx context.Context, id string) error
	MarkAllAsRead(ctx context.Context, storeID, userID uuid.UUID) error
	GetPreferences(ctx context.Context, userID uuid.UUID) (*dto.NotificationPreferences, error)
	SavePreferences(ctx context.Context, userID uuid.UUID, prefs *dto.NotificationPreferences) error
	CreateNotification(ctx context.Context, req *dto.CreateNotificationRequest) error
	NotifyStoreUsers(ctx context.Context, storeID uuid.UUID, notifType, title, message, severity string, data map[string]interface{})
}
