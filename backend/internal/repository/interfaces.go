package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetByStoreID(ctx context.Context, storeID uuid.UUID, page, limit int) ([]model.User, int64, error)
	Update(ctx context.Context, user *model.User) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
}

// RoleRepository defines the interface for role data access
type RoleRepository interface {
	Create(ctx context.Context, role *model.Role) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Role, error)
	GetByName(ctx context.Context, name string) (*model.Role, error)
	GetByStoreID(ctx context.Context, storeID uuid.UUID) ([]model.Role, error)
	GetSystemRoles(ctx context.Context) ([]model.Role, error)
	Update(ctx context.Context, role *model.Role) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// StoreRepository defines the interface for store data access
type StoreRepository interface {
	Create(ctx context.Context, store *model.Store) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Store, error)
	GetByCode(ctx context.Context, code string) (*model.Store, error)
	GetAll(ctx context.Context) ([]model.Store, error)
	Update(ctx context.Context, store *model.Store) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// CategoryRepository defines the interface for category data access
type CategoryRepository interface {
	Create(ctx context.Context, category *model.Category) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Category, error)
	GetByStoreID(ctx context.Context, storeID uuid.UUID) ([]model.Category, error)
	GetTree(ctx context.Context, storeID uuid.UUID) ([]model.Category, error)
	GetDescendantIDs(ctx context.Context, storeID uuid.UUID, parentID uuid.UUID) ([]uuid.UUID, error)
	Update(ctx context.Context, category *model.Category) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// ProductRepository defines the interface for product data access
type ProductRepository interface {
	Create(ctx context.Context, product *model.Product) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Product, error)
	GetBySlug(ctx context.Context, storeID uuid.UUID, slug string) (*model.Product, error)
	List(ctx context.Context, storeID uuid.UUID, params ProductListParams) ([]model.Product, int64, error)
	Update(ctx context.Context, product *model.Product) error
	Delete(ctx context.Context, id uuid.UUID) error
	Search(ctx context.Context, storeID uuid.UUID, query string, limit int) ([]model.Product, error)
}

// ProductListParams for filtering products in the repository
type ProductListParams struct {
	Page        int
	Limit       int
	Search      string
	CategoryID  uuid.UUID
	CategoryIDs []uuid.UUID // filter by multiple category IDs (includes children)
	Brand       string
	IsActive    *bool
	SortBy      string
	SortOrder   string
	MinPrice    *float64
	MaxPrice    *float64
}

// ProductVariantRepository defines the interface for variant data access
type ProductVariantRepository interface {
	Create(ctx context.Context, variant *model.ProductVariant) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.ProductVariant, error)
	GetBySKU(ctx context.Context, sku string) (*model.ProductVariant, error)
	GetByBarcode(ctx context.Context, barcode string) (*model.ProductVariant, error)
	GetByProductID(ctx context.Context, productID uuid.UUID) ([]model.ProductVariant, error)
	Update(ctx context.Context, variant *model.ProductVariant) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// InventoryRepository defines the interface for inventory data access
type InventoryRepository interface {
	Create(ctx context.Context, inventory *model.Inventory) error
	GetByVariantID(ctx context.Context, storeID, variantID uuid.UUID) (*model.Inventory, error)
	GetLowStock(ctx context.Context, storeID uuid.UUID, page, limit int) ([]model.Inventory, int64, error)
	UpdateQuantity(ctx context.Context, id uuid.UUID, quantity int) error
	ReserveStock(ctx context.Context, id uuid.UUID, quantity int) error
	ReleaseStock(ctx context.Context, id uuid.UUID, quantity int) error
	CreateMovement(ctx context.Context, movement *model.InventoryMovement) error
	GetMovements(ctx context.Context, storeID, variantID uuid.UUID, page, limit int) ([]model.InventoryMovement, int64, error)
}

// OrderRepository defines the interface for order data access
type OrderRepository interface {
	Create(ctx context.Context, order *model.Order) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Order, error)
	GetByOrderNumber(ctx context.Context, orderNumber string) (*model.Order, error)
	List(ctx context.Context, storeID uuid.UUID, params OrderListParams) ([]model.Order, int64, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	Update(ctx context.Context, order *model.Order) error
	GetDailySales(ctx context.Context, storeID uuid.UUID, start, end time.Time) (float64, int, error)
	GetCustomerPurchasedItems(ctx context.Context, storeID, customerID uuid.UUID) ([]dto.CustomerPurchasedItemResponse, error)
}

// OrderListParams for filtering orders
type OrderListParams struct {
	Page       int
	Limit      int
	Search     string
	Status     string
	CustomerID uuid.UUID
	UserID     uuid.UUID
	DateFrom   string
	DateTo     string
	SortBy     string
	SortOrder  string
}

// PaymentRepository defines the interface for payment data access
type PaymentRepository interface {
	Create(ctx context.Context, payment *model.Payment) error
	GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]model.Payment, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
}

// CustomerRepository defines the interface for customer data access
type CustomerRepository interface {
	Create(ctx context.Context, customer *model.Customer) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Customer, error)
	GetByPhone(ctx context.Context, storeID uuid.UUID, phone string) (*model.Customer, error)
	List(ctx context.Context, storeID uuid.UUID, page, limit int, search string) ([]model.Customer, int64, error)
	Update(ctx context.Context, customer *model.Customer) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateStats(ctx context.Context, id uuid.UUID, totalSpent float64, orderCount int) error
}

// SupplierRepository defines the interface for supplier data access
type SupplierRepository interface {
	Create(ctx context.Context, supplier *model.Supplier) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Supplier, error)
	List(ctx context.Context, storeID uuid.UUID, page, limit int, search string) ([]model.Supplier, int64, error)
	Update(ctx context.Context, supplier *model.Supplier) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// WarrantyRepository defines the interface for warranty data access
type WarrantyRepository interface {
	Create(ctx context.Context, warranty *model.Warranty) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Warranty, error)
	GetByCode(ctx context.Context, code string) (*model.Warranty, error)
	GetBySerialNumber(ctx context.Context, serial string) ([]model.Warranty, error)
	GetByCustomerPhone(ctx context.Context, phone string) ([]model.Warranty, error)
	GetByOrderNumber(ctx context.Context, orderNumber string) ([]model.Warranty, error)
	List(ctx context.Context, storeID uuid.UUID, params WarrantyListParams) ([]model.Warranty, int64, error)
	GetExpiring(ctx context.Context, storeID uuid.UUID, days int, page, limit int) ([]model.Warranty, int64, error)
	CountActiveClaimsByStoreID(ctx context.Context, storeID uuid.UUID) (int64, error)
	Update(ctx context.Context, warranty *model.Warranty) error
	GetCustomerByID(ctx context.Context, id uuid.UUID) (*model.Customer, error)
	GetVariantByID(ctx context.Context, id uuid.UUID) (*model.ProductVariant, error)
	CreateClaim(ctx context.Context, claim *model.WarrantyClaim) error
	GetClaimByID(ctx context.Context, id uuid.UUID) (*model.WarrantyClaim, error)
	GetClaimsByWarrantyID(ctx context.Context, warrantyID uuid.UUID) ([]model.WarrantyClaim, error)
	UpdateClaim(ctx context.Context, claim *model.WarrantyClaim) error
}

// WarrantyListParams for filtering warranties
type WarrantyListParams struct {
	Page       int
	Limit      int
	Search     string
	Status     string
	CustomerID uuid.UUID
	DateFrom   string
	DateTo     string
}

// POSSessionRepository defines the interface for POS session data access
type POSSessionRepository interface {
	Create(ctx context.Context, session *model.POSSession) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.POSSession, error)
	GetOpenSession(ctx context.Context, storeID, userID uuid.UUID) (*model.POSSession, error)
	Close(ctx context.Context, session *model.POSSession) error
	UpdateSales(ctx context.Context, id uuid.UUID, totalSales float64, totalOrders int) error
	List(ctx context.Context, storeID uuid.UUID, page, limit int) ([]model.POSSession, int64, error)
}

// StocktakeRepository defines the interface for stocktake data access
type StocktakeRepository interface {
	Create(ctx context.Context, stocktake *model.Stocktake) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Stocktake, error)
	List(ctx context.Context, storeID uuid.UUID, page, limit int, status, search string) ([]model.Stocktake, int64, error)
	Update(ctx context.Context, stocktake *model.Stocktake) error
	AddItem(ctx context.Context, item *model.StocktakeItem) error
	GetItems(ctx context.Context, stocktakeID uuid.UUID) ([]model.StocktakeItem, error)
	GetItemsWithProductInfo(ctx context.Context, stocktakeID uuid.UUID) ([]StocktakeItemWithProduct, error)
	GetItemByVariant(ctx context.Context, stocktakeID, variantID uuid.UUID) (*model.StocktakeItem, error)
	UpdateItem(ctx context.Context, item *model.StocktakeItem) error
	DeleteItem(ctx context.Context, itemID uuid.UUID) error
}

// StocktakeItemWithProduct holds item data + joined product info
type StocktakeItemWithProduct struct {
	model.StocktakeItem
	ProductName string
	VariantName string
	SKU         string
	Barcode     string
}

// PurchaseOrderRepository defines the interface for purchase order data access
type PurchaseOrderRepository interface {
	Create(ctx context.Context, po *model.PurchaseOrder) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.PurchaseOrder, error)
	List(ctx context.Context, storeID uuid.UUID, page, limit int, status string) ([]model.PurchaseOrder, int64, error)
	ListBySupplier(ctx context.Context, storeID, supplierID uuid.UUID, page, limit int) ([]model.PurchaseOrder, int64, error)
	Update(ctx context.Context, po *model.PurchaseOrder) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
}
