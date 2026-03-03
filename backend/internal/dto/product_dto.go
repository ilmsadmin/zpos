package dto

import (
	"time"

	"github.com/google/uuid"
)

// --- Product DTOs ---

type ProductResponse struct {
	ID          uuid.UUID         `json:"id"`
	StoreID     uuid.UUID         `json:"store_id"`
	CategoryID  uuid.UUID         `json:"category_id"`
	Name        string            `json:"name"`
	Slug        string            `json:"slug"`
	Description string            `json:"description"`
	Brand       string            `json:"brand"`
	Unit        string            `json:"unit"`
	Tags        []string          `json:"tags"`
	IsActive    bool              `json:"is_active"`
	Category    *CategoryResponse `json:"category,omitempty"`
	Variants    []VariantResponse `json:"variants,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

type CreateProductRequest struct {
	CategoryID  uuid.UUID              `json:"category_id" validate:"required,uuid"`
	Name        string                 `json:"name" validate:"required,min=2,max=200"`
	Description string                 `json:"description"`
	Brand       string                 `json:"brand"`
	Unit        string                 `json:"unit" validate:"required"`
	Tags        []string               `json:"tags"`
	Variants    []CreateVariantRequest `json:"variants" validate:"required,min=1,dive"`
}

type UpdateProductRequest struct {
	CategoryID  *uuid.UUID `json:"category_id" validate:"omitempty,uuid"`
	Name        string     `json:"name" validate:"omitempty,min=2,max=200"`
	Description string     `json:"description"`
	Brand       string     `json:"brand"`
	Unit        string     `json:"unit"`
	Tags        []string   `json:"tags"`
	IsActive    *bool      `json:"is_active"`
}

type ProductListParams struct {
	Page       int       `query:"page"`
	Limit      int       `query:"limit"`
	Search     string    `query:"search"`
	CategoryID uuid.UUID `query:"category_id"`
	Brand      string    `query:"brand"`
	IsActive   *bool     `query:"is_active"`
	SortBy     string    `query:"sort_by"`
	SortOrder  string    `query:"sort_order"`
	MinPrice   *float64  `query:"min_price"`
	MaxPrice   *float64  `query:"max_price"`
}

// --- Variant DTOs ---

type VariantResponse struct {
	ID             uuid.UUID              `json:"id"`
	ProductID      uuid.UUID              `json:"product_id"`
	SKU            string                 `json:"sku"`
	Barcode        string                 `json:"barcode"`
	Name           string                 `json:"name"`
	CostPrice      float64                `json:"cost_price"`
	SellingPrice   float64                `json:"selling_price"`
	CompareAtPrice *float64               `json:"compare_at_price"`
	Weight         *float64               `json:"weight"`
	Attributes     map[string]interface{} `json:"attributes"`
	Images         []string               `json:"images"`
	IsActive       bool                   `json:"is_active"`
	Inventory      *InventoryResponse     `json:"inventory,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
}

type CreateVariantRequest struct {
	SKU            string                 `json:"sku" validate:"omitempty,sku"`
	Barcode        string                 `json:"barcode" validate:"omitempty,barcode"`
	Name           string                 `json:"name" validate:"required,min=1,max=200"`
	CostPrice      float64                `json:"cost_price" validate:"gte=0"`
	SellingPrice   float64                `json:"selling_price" validate:"gte=0"`
	CompareAtPrice *float64               `json:"compare_at_price" validate:"omitempty,gte=0"`
	Weight         *float64               `json:"weight" validate:"omitempty,gte=0"`
	Attributes     map[string]interface{} `json:"attributes"`
	Images         []string               `json:"images"`
	InitialStock   int                    `json:"initial_stock" validate:"gte=0"`
}

type UpdateVariantRequest struct {
	SKU            string                 `json:"sku" validate:"omitempty,sku"`
	Barcode        string                 `json:"barcode" validate:"omitempty,barcode"`
	Name           string                 `json:"name" validate:"omitempty,min=1,max=200"`
	CostPrice      *float64               `json:"cost_price" validate:"omitempty,gte=0"`
	SellingPrice   *float64               `json:"selling_price" validate:"omitempty,gte=0"`
	CompareAtPrice *float64               `json:"compare_at_price" validate:"omitempty,gte=0"`
	Weight         *float64               `json:"weight" validate:"omitempty,gte=0"`
	Attributes     map[string]interface{} `json:"attributes"`
	Images         []string               `json:"images"`
	IsActive       *bool                  `json:"is_active"`
}

// --- Category DTOs ---

type CategoryResponse struct {
	ID          uuid.UUID          `json:"id"`
	StoreID     uuid.UUID          `json:"store_id"`
	ParentID    *uuid.UUID         `json:"parent_id"`
	Name        string             `json:"name"`
	Slug        string             `json:"slug"`
	Description string             `json:"description"`
	ImageURL    string             `json:"image_url"`
	SortOrder   int                `json:"sort_order"`
	IsActive    bool               `json:"is_active"`
	Children    []CategoryResponse `json:"children,omitempty"`
}

type CreateCategoryRequest struct {
	ParentID    *uuid.UUID `json:"parent_id" validate:"omitempty,uuid"`
	Name        string     `json:"name" validate:"required,min=2,max=100"`
	Description string     `json:"description"`
	ImageURL    string     `json:"image_url" validate:"omitempty,url"`
	SortOrder   int        `json:"sort_order"`
}

type UpdateCategoryRequest struct {
	ParentID    *uuid.UUID `json:"parent_id" validate:"omitempty,uuid"`
	Name        string     `json:"name" validate:"omitempty,min=2,max=100"`
	Description string     `json:"description"`
	ImageURL    string     `json:"image_url" validate:"omitempty,url"`
	SortOrder   *int       `json:"sort_order"`
	IsActive    *bool      `json:"is_active"`
}

// --- Inventory DTOs ---

type InventoryResponse struct {
	ID               uuid.UUID `json:"id"`
	StoreID          uuid.UUID `json:"store_id"`
	ProductVariantID uuid.UUID `json:"product_variant_id"`
	ProductName      string    `json:"product_name"`
	VariantName      string    `json:"variant_name"`
	SKU              string    `json:"sku"`
	Quantity         int       `json:"quantity"`
	ReservedQty      int       `json:"reserved_qty"`
	AvailableQty     int       `json:"available_qty"`
	MinStockLevel    int       `json:"min_stock_level"`
	MaxStockLevel    *int      `json:"max_stock_level"`
	Location         string    `json:"location"`
	IsLowStock       bool      `json:"is_low_stock"`
}

type AdjustInventoryRequest struct {
	ProductVariantID uuid.UUID `json:"product_variant_id" validate:"required,uuid"`
	Quantity         int       `json:"quantity" validate:"required"`
	Type             string    `json:"type" validate:"required,oneof=in out adjustment"`
	Reason           string    `json:"reason" validate:"required,min=2"`
	Notes            string    `json:"notes"`
}

type BulkAdjustInventoryRequest struct {
	Items []AdjustInventoryRequest `json:"items" validate:"required,min=1,dive"`
}
