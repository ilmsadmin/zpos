package model

import (
	"time"

	"github.com/google/uuid"
)

// Store represents a physical store location
type Store struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	Name      string     `json:"name" db:"name"`
	Code      string     `json:"code" db:"code"`
	Address   string     `json:"address" db:"address"`
	Phone     string     `json:"phone" db:"phone"`
	Email     string     `json:"email" db:"email"`
	LogoURL   string     `json:"logo_url" db:"logo_url"`
	IsActive  bool       `json:"is_active" db:"is_active"`
	Settings  JSONB      `json:"settings" db:"settings"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// User represents a system user
type User struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	StoreID      uuid.UUID  `json:"store_id" db:"store_id"`
	RoleID       uuid.UUID  `json:"role_id" db:"role_id"`
	Email        string     `json:"email" db:"email"`
	PasswordHash string     `json:"-" db:"password_hash"`
	FullName     string     `json:"full_name" db:"full_name"`
	Phone        string     `json:"phone" db:"phone"`
	AvatarURL    string     `json:"avatar_url" db:"avatar_url"`
	IsActive     bool       `json:"is_active" db:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at" db:"last_login_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`

	// Relations (not stored in DB)
	Store *Store `json:"store,omitempty" db:"-"`
	Role  *Role  `json:"role,omitempty" db:"-"`
}

// Role represents a user role with permissions
type Role struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	StoreID     *uuid.UUID `json:"store_id" db:"store_id"`
	Name        string     `json:"name" db:"name"`
	DisplayName string     `json:"display_name" db:"display_name"`
	Description string     `json:"description" db:"description"`
	Permissions JSONB      `json:"permissions" db:"permissions"`
	IsSystem    bool       `json:"is_system" db:"is_system"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// Category represents a product category
type Category struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	StoreID     uuid.UUID  `json:"store_id" db:"store_id"`
	ParentID    *uuid.UUID `json:"parent_id" db:"parent_id"`
	Name        string     `json:"name" db:"name"`
	Slug        string     `json:"slug" db:"slug"`
	Description string     `json:"description" db:"description"`
	ImageURL    string     `json:"image_url" db:"image_url"`
	SortOrder   int        `json:"sort_order" db:"sort_order"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`

	// Relations
	Children []Category `json:"children,omitempty" db:"-"`
}

// Product represents a product
type Product struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	StoreID     uuid.UUID  `json:"store_id" db:"store_id"`
	CategoryID  uuid.UUID  `json:"category_id" db:"category_id"`
	Name        string     `json:"name" db:"name"`
	Slug        string     `json:"slug" db:"slug"`
	Description string     `json:"description" db:"description"`
	Brand       string     `json:"brand" db:"brand"`
	Unit        string     `json:"unit" db:"unit"`
	Tags        StringArr  `json:"tags" db:"tags"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`

	// Relations
	Category *Category        `json:"category,omitempty" db:"-"`
	Variants []ProductVariant `json:"variants,omitempty" db:"-"`
}

// ProductVariant represents a specific variant of a product (color, size, etc.)
type ProductVariant struct {
	ID             uuid.UUID `json:"id" db:"id"`
	ProductID      uuid.UUID `json:"product_id" db:"product_id"`
	SKU            string    `json:"sku" db:"sku"`
	Barcode        string    `json:"barcode" db:"barcode"`
	Name           string    `json:"name" db:"name"`
	CostPrice      float64   `json:"cost_price" db:"cost_price"`
	SellingPrice   float64   `json:"selling_price" db:"selling_price"`
	CompareAtPrice *float64  `json:"compare_at_price" db:"compare_at_price"`
	Weight         *float64  `json:"weight" db:"weight"`
	Attributes     JSONB     `json:"attributes" db:"attributes"`
	Images         StringArr `json:"images" db:"images"`
	IsActive       bool      `json:"is_active" db:"is_active"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`

	// Relations
	Inventory *Inventory `json:"inventory,omitempty" db:"-"`
}

// Inventory represents stock levels for a product variant
type Inventory struct {
	ID               uuid.UUID `json:"id" db:"id"`
	StoreID          uuid.UUID `json:"store_id" db:"store_id"`
	ProductVariantID uuid.UUID `json:"product_variant_id" db:"product_variant_id"`
	Quantity         int       `json:"quantity" db:"quantity"`
	ReservedQty      int       `json:"reserved_qty" db:"reserved_qty"`
	MinStockLevel    int       `json:"min_stock_level" db:"min_stock_level"`
	MaxStockLevel    *int      `json:"max_stock_level" db:"max_stock_level"`
	Location         string    `json:"location" db:"location"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`

	// Joined fields (not stored in inventory table)
	ProductName string `json:"product_name" db:"-"`
	VariantName string `json:"variant_name" db:"-"`
	SKU         string `json:"sku" db:"-"`
}

// AvailableQty returns the available quantity (total - reserved)
func (i *Inventory) AvailableQty() int {
	return i.Quantity - i.ReservedQty
}

// IsLowStock checks if inventory is below minimum level
func (i *Inventory) IsLowStock() bool {
	return i.AvailableQty() <= i.MinStockLevel
}

// InventoryMovement tracks inventory changes
type InventoryMovement struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	StoreID          uuid.UUID  `json:"store_id" db:"store_id"`
	ProductVariantID uuid.UUID  `json:"product_variant_id" db:"product_variant_id"`
	Type             string     `json:"type" db:"type"` // in, out, adjustment, transfer
	Quantity         int        `json:"quantity" db:"quantity"`
	PreviousQty      int        `json:"previous_qty" db:"previous_qty"`
	NewQty           int        `json:"new_qty" db:"new_qty"`
	ReferenceType    string     `json:"reference_type" db:"reference_type"` // order, purchase_order, stocktake, manual
	ReferenceID      *uuid.UUID `json:"reference_id" db:"reference_id"`
	Notes            string     `json:"notes" db:"notes"`
	CreatedBy        uuid.UUID  `json:"created_by" db:"created_by"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
}

// Customer represents a customer
type Customer struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	StoreID     uuid.UUID  `json:"store_id" db:"store_id"`
	FullName    string     `json:"full_name" db:"full_name"`
	Phone       string     `json:"phone" db:"phone"`
	Email       string     `json:"email" db:"email"`
	Address     string     `json:"address" db:"address"`
	DateOfBirth *time.Time `json:"date_of_birth" db:"date_of_birth"`
	Gender      string     `json:"gender" db:"gender"`
	Notes       string     `json:"notes" db:"notes"`
	TotalSpent  float64    `json:"total_spent" db:"total_spent"`
	OrderCount  int        `json:"order_count" db:"order_count"`
	Points      int        `json:"points" db:"points"`
	Tags        StringArr  `json:"tags" db:"tags"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// JSONB is a custom type for PostgreSQL JSONB columns
type JSONB map[string]interface{}

// StringArr is a custom type for PostgreSQL text[] columns
type StringArr []string
