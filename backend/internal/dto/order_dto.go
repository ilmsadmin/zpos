package dto

import (
	"time"

	"github.com/google/uuid"
)

// --- Order DTOs ---

type OrderResponse struct {
	ID             uuid.UUID           `json:"id"`
	StoreID        uuid.UUID           `json:"store_id"`
	CustomerID     *uuid.UUID          `json:"customer_id"`
	UserID         uuid.UUID           `json:"user_id"`
	OrderNumber    string              `json:"order_number"`
	Status         string              `json:"status"`
	SubTotal       float64             `json:"sub_total"`
	DiscountType   string              `json:"discount_type"`
	DiscountValue  float64             `json:"discount_value"`
	DiscountAmount float64             `json:"discount_amount"`
	TaxAmount      float64             `json:"tax_amount"`
	TotalAmount    float64             `json:"total_amount"`
	PaidAmount     float64             `json:"paid_amount"`
	ChangeAmount   float64             `json:"change_amount"`
	Notes          string              `json:"notes"`
	Customer       *CustomerResponse   `json:"customer,omitempty"`
	Items          []OrderItemResponse `json:"items"`
	Payments       []PaymentResponse   `json:"payments"`
	CreatedAt      time.Time           `json:"created_at"`
	UpdatedAt      time.Time           `json:"updated_at"`
}

type CreateOrderRequest struct {
	CustomerID    *uuid.UUID               `json:"customer_id" validate:"omitempty,uuid"`
	POSSessionID  *uuid.UUID               `json:"pos_session_id" validate:"omitempty,uuid"`
	DiscountType  string                   `json:"discount_type" validate:"omitempty,oneof=percentage fixed"`
	DiscountValue float64                  `json:"discount_value" validate:"gte=0"`
	Notes         string                   `json:"notes"`
	Items         []CreateOrderItemRequest `json:"items" validate:"required,min=1,dive"`
	Payments      []CreatePaymentRequest   `json:"payments" validate:"required,min=1,dive"`
}

type CreateOrderItemRequest struct {
	ProductVariantID uuid.UUID `json:"product_variant_id" validate:"required,uuid"`
	Quantity         int       `json:"quantity" validate:"required,gte=1"`
	UnitPrice        float64   `json:"unit_price" validate:"gte=0"`
	DiscountType     string    `json:"discount_type" validate:"omitempty,oneof=percentage fixed"`
	DiscountValue    float64   `json:"discount_value" validate:"gte=0"`
	WarrantyMonths   int       `json:"warranty_months" validate:"gte=0"`
	Notes            string    `json:"notes"`
}

type CreatePaymentRequest struct {
	Method        string  `json:"method" validate:"required,oneof=cash card transfer momo zalopay vnpay"`
	Amount        float64 `json:"amount" validate:"required,gt=0"`
	TransactionID string  `json:"transaction_id"`
	Notes         string  `json:"notes"`
}

type OrderItemResponse struct {
	ID               uuid.UUID `json:"id"`
	ProductVariantID uuid.UUID `json:"product_variant_id"`
	ProductName      string    `json:"product_name"`
	VariantName      string    `json:"variant_name"`
	SKU              string    `json:"sku"`
	Quantity         int       `json:"quantity"`
	UnitPrice        float64   `json:"unit_price"`
	DiscountType     string    `json:"discount_type"`
	DiscountValue    float64   `json:"discount_value"`
	DiscountAmount   float64   `json:"discount_amount"`
	TotalPrice       float64   `json:"total_price"`
	WarrantyMonths   int       `json:"warranty_months"`
}

type PaymentResponse struct {
	ID            uuid.UUID  `json:"id"`
	Method        string     `json:"method"`
	Amount        float64    `json:"amount"`
	Status        string     `json:"status"`
	TransactionID string     `json:"transaction_id"`
	PaidAt        *time.Time `json:"paid_at"`
}

type OrderListParams struct {
	Page       int       `query:"page"`
	Limit      int       `query:"limit"`
	Search     string    `query:"search"`
	Status     string    `query:"status"`
	CustomerID uuid.UUID `query:"customer_id"`
	UserID     uuid.UUID `query:"user_id"`
	DateFrom   string    `query:"date_from"`
	DateTo     string    `query:"date_to"`
	SortBy     string    `query:"sort_by"`
	SortOrder  string    `query:"sort_order"`
}

// --- Customer DTOs ---

type CustomerResponse struct {
	ID          uuid.UUID  `json:"id"`
	StoreID     uuid.UUID  `json:"store_id"`
	FullName    string     `json:"full_name"`
	Phone       string     `json:"phone"`
	Email       string     `json:"email"`
	Address     string     `json:"address"`
	DateOfBirth *time.Time `json:"date_of_birth"`
	Gender      string     `json:"gender"`
	TotalSpent  float64    `json:"total_spent"`
	OrderCount  int        `json:"order_count"`
	Points      int        `json:"points"`
	Tags        []string   `json:"tags"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
}

type CreateCustomerRequest struct {
	FullName    string     `json:"full_name" validate:"required,min=2,max=100"`
	Phone       string     `json:"phone" validate:"required,phone_vn"`
	Email       string     `json:"email" validate:"omitempty,email"`
	Address     string     `json:"address"`
	DateOfBirth *time.Time `json:"date_of_birth"`
	Gender      string     `json:"gender" validate:"omitempty,oneof=male female other"`
	Notes       string     `json:"notes"`
	Tags        []string   `json:"tags"`
}

type UpdateCustomerRequest struct {
	FullName    string     `json:"full_name" validate:"omitempty,min=2,max=100"`
	Phone       string     `json:"phone" validate:"omitempty,phone_vn"`
	Email       string     `json:"email" validate:"omitempty,email"`
	Address     string     `json:"address"`
	DateOfBirth *time.Time `json:"date_of_birth"`
	Gender      string     `json:"gender" validate:"omitempty,oneof=male female other"`
	Notes       string     `json:"notes"`
	Tags        []string   `json:"tags"`
	IsActive    *bool      `json:"is_active"`
}

type CustomerListParams struct {
	Page      int    `query:"page"`
	Limit     int    `query:"limit"`
	Search    string `query:"search"`
	SortBy    string `query:"sort_by"`
	SortOrder string `query:"sort_order"`
}

// --- Warranty DTOs ---

type WarrantyResponse struct {
	ID             uuid.UUID               `json:"id"`
	StoreID        uuid.UUID               `json:"store_id"`
	WarrantyCode   string                  `json:"warranty_code"`
	SerialNumber   string                  `json:"serial_number"`
	StartDate      time.Time               `json:"start_date"`
	EndDate        time.Time               `json:"end_date"`
	WarrantyMonths int                     `json:"warranty_months"`
	Status         string                  `json:"status"`
	DaysRemaining  int                     `json:"days_remaining"`
	Terms          string                  `json:"terms"`
	Notes          string                  `json:"notes"`
	Customer       *CustomerResponse       `json:"customer,omitempty"`
	ProductVariant *VariantResponse        `json:"product_variant,omitempty"`
	Claims         []WarrantyClaimResponse `json:"claims,omitempty"`
	CreatedAt      time.Time               `json:"created_at"`
}

type WarrantyListParams struct {
	Page       int       `query:"page"`
	Limit      int       `query:"limit"`
	Search     string    `query:"search"`
	Status     string    `query:"status"`
	CustomerID uuid.UUID `query:"customer_id"`
	DateFrom   string    `query:"date_from"`
	DateTo     string    `query:"date_to"`
}

type CreateWarrantyClaimRequest struct {
	Issue       string   `json:"issue" validate:"required,min=5"`
	Description string   `json:"description"`
	Images      []string `json:"images"`
}

type UpdateWarrantyClaimRequest struct {
	Status          string `json:"status" validate:"omitempty,oneof=pending received processing completed rejected returned"`
	Resolution      string `json:"resolution"`
	TechnicianNotes string `json:"technician_notes"`
}

type UpdateClaimStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=pending received processing completed rejected returned"`
	Notes  string `json:"notes"`
}

type ReturnClaimRequest struct {
	Notes string `json:"notes"`
}

type CreateWarrantyRequest struct {
	OrderItemID      *uuid.UUID `json:"order_item_id" validate:"omitempty,uuid"`
	CustomerID       uuid.UUID  `json:"customer_id" validate:"required"`
	ProductVariantID uuid.UUID  `json:"product_variant_id" validate:"required"`
	SerialNumber     string     `json:"serial_number" validate:"required"`
	WarrantyMonths   int        `json:"warranty_months" validate:"required,min=1,max=120"`
	Terms            string     `json:"terms"`
	Notes            string     `json:"notes"`
}

// CustomerPurchasedItemResponse represents a product item purchased by a customer
// that can be used to create a warranty
type CustomerPurchasedItemResponse struct {
	OrderItemID      uuid.UUID `json:"order_item_id"`
	OrderID          uuid.UUID `json:"order_id"`
	OrderNumber      string    `json:"order_number"`
	OrderDate        time.Time `json:"order_date"`
	ProductVariantID uuid.UUID `json:"product_variant_id"`
	ProductName      string    `json:"product_name"`
	VariantName      string    `json:"variant_name"`
	SKU              string    `json:"sku"`
	Quantity         int       `json:"quantity"`
	UnitPrice        float64   `json:"unit_price"`
	WarrantyMonths   int       `json:"warranty_months"`
	HasWarranty      bool      `json:"has_warranty"`
}

type UpdateWarrantyRequest struct {
	SerialNumber string `json:"serial_number"`
	Terms        string `json:"terms"`
	Notes        string `json:"notes"`
}

// PublicWarrantyResponse is the warranty response for public customer lookup (no sensitive data)
type PublicWarrantyResponse struct {
	WarrantyCode   string                        `json:"warranty_code"`
	SerialNumber   string                        `json:"serial_number"`
	ProductName    string                        `json:"product_name"`
	VariantName    string                        `json:"variant_name"`
	CustomerName   string                        `json:"customer_name"`
	CustomerPhone  string                        `json:"customer_phone"`
	StartDate      time.Time                     `json:"start_date"`
	EndDate        time.Time                     `json:"end_date"`
	WarrantyMonths int                           `json:"warranty_months"`
	Status         string                        `json:"status"`
	DaysRemaining  int                           `json:"days_remaining"`
	Terms          string                        `json:"terms"`
	Claims         []PublicWarrantyClaimResponse `json:"claims,omitempty"`
}

// PublicWarrantyClaimResponse is the claim response for public customer lookup
type PublicWarrantyClaimResponse struct {
	ClaimNumber   string     `json:"claim_number"`
	Issue         string     `json:"issue"`
	Status        string     `json:"status"`
	Resolution    string     `json:"resolution"`
	ReceivedDate  *time.Time `json:"received_date"`
	CompletedDate *time.Time `json:"completed_date"`
	ReturnedDate  *time.Time `json:"returned_date"`
	CreatedAt     time.Time  `json:"created_at"`
}

type WarrantyClaimResponse struct {
	ID              uuid.UUID  `json:"id"`
	WarrantyID      uuid.UUID  `json:"warranty_id"`
	ClaimNumber     string     `json:"claim_number"`
	Issue           string     `json:"issue"`
	Description     string     `json:"description"`
	Status          string     `json:"status"`
	Resolution      string     `json:"resolution"`
	TechnicianNotes string     `json:"technician_notes"`
	ReceivedDate    *time.Time `json:"received_date"`
	CompletedDate   *time.Time `json:"completed_date"`
	ReturnedDate    *time.Time `json:"returned_date"`
	Images          []string   `json:"images"`
	CreatedAt       time.Time  `json:"created_at"`
}

// --- Supplier DTOs ---

type SupplierResponse struct {
	ID          uuid.UUID `json:"id"`
	StoreID     uuid.UUID `json:"store_id"`
	Name        string    `json:"name"`
	ContactName string    `json:"contact_name"`
	Phone       string    `json:"phone"`
	Email       string    `json:"email"`
	Address     string    `json:"address"`
	TaxCode     string    `json:"tax_code"`
	BankAccount string    `json:"bank_account"`
	BankName    string    `json:"bank_name"`
	Notes       string    `json:"notes"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

type SupplierDebtSummary struct {
	TotalOrders     int64   `json:"total_orders"`
	TotalAmount     float64 `json:"total_amount"`
	ReceivedAmount  float64 `json:"received_amount"`
	PendingAmount   float64 `json:"pending_amount"`
	DraftOrders     int64   `json:"draft_orders"`
	ConfirmedOrders int64   `json:"confirmed_orders"`
	ReceivedOrders  int64   `json:"received_orders"`
	CancelledOrders int64   `json:"cancelled_orders"`
}

type CreateSupplierRequest struct {
	Name        string `json:"name" validate:"required,min=2,max=200"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone" validate:"required,phone_vn"`
	Email       string `json:"email" validate:"omitempty,email"`
	Address     string `json:"address"`
	TaxCode     string `json:"tax_code"`
	BankAccount string `json:"bank_account"`
	BankName    string `json:"bank_name"`
	Notes       string `json:"notes"`
}

type UpdateSupplierRequest struct {
	Name        string `json:"name" validate:"omitempty,min=2,max=200"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone" validate:"omitempty,phone_vn"`
	Email       string `json:"email" validate:"omitempty,email"`
	Address     string `json:"address"`
	TaxCode     string `json:"tax_code"`
	BankAccount string `json:"bank_account"`
	BankName    string `json:"bank_name"`
	Notes       string `json:"notes"`
	IsActive    *bool  `json:"is_active"`
}

// --- POS Session DTOs ---

type OpenPOSSessionRequest struct {
	OpeningAmount float64 `json:"opening_amount" validate:"gte=0"`
	Notes         string  `json:"notes"`
}

type ClosePOSSessionRequest struct {
	ClosingAmount float64 `json:"closing_amount" validate:"gte=0"`
	Notes         string  `json:"notes"`
}

type POSSessionResponse struct {
	ID             uuid.UUID  `json:"id"`
	StoreID        uuid.UUID  `json:"store_id"`
	UserID         uuid.UUID  `json:"user_id"`
	UserName       string     `json:"user_name"`
	OpeningAmount  float64    `json:"opening_amount"`
	ClosingAmount  *float64   `json:"closing_amount"`
	ExpectedAmount *float64   `json:"expected_amount"`
	Difference     *float64   `json:"difference"`
	TotalSales     float64    `json:"total_sales"`
	TotalOrders    int        `json:"total_orders"`
	Status         string     `json:"status"`
	Notes          string     `json:"notes"`
	OpenedAt       time.Time  `json:"opened_at"`
	ClosedAt       *time.Time `json:"closed_at"`
}

// --- Purchase Order DTOs ---

type PurchaseOrderResponse struct {
	ID           uuid.UUID                   `json:"id"`
	StoreID      uuid.UUID                   `json:"store_id"`
	SupplierID   uuid.UUID                   `json:"supplier_id"`
	UserID       uuid.UUID                   `json:"user_id"`
	OrderNumber  string                      `json:"order_number"`
	PONumber     string                      `json:"po_number"`
	Status       string                      `json:"status"`
	TotalAmount  float64                     `json:"total_amount"`
	Notes        string                      `json:"notes"`
	ExpectedDate *time.Time                  `json:"expected_date"`
	ReceivedDate *time.Time                  `json:"received_date"`
	Supplier     *SupplierResponse           `json:"supplier,omitempty"`
	Items        []PurchaseOrderItemResponse `json:"items"`
	CreatedAt    time.Time                   `json:"created_at"`
	UpdatedAt    time.Time                   `json:"updated_at"`
}

type PurchaseOrderItemResponse struct {
	ID               uuid.UUID `json:"id"`
	ProductVariantID uuid.UUID `json:"product_variant_id"`
	ProductName      string    `json:"product_name"`
	VariantName      string    `json:"variant_name"`
	SKU              string    `json:"sku"`
	Quantity         int       `json:"quantity"`
	ReceivedQty      int       `json:"received_qty"`
	UnitPrice        float64   `json:"unit_price"`
	UnitCost         float64   `json:"unit_cost"`
	TotalPrice       float64   `json:"total_price"`
	TotalCost        float64   `json:"total_cost"`
}

type CreatePurchaseOrderRequest struct {
	SupplierID   uuid.UUID                        `json:"supplier_id" validate:"required,uuid"`
	Notes        string                           `json:"notes"`
	ExpectedDate *time.Time                       `json:"expected_date"`
	Items        []CreatePurchaseOrderItemRequest `json:"items" validate:"required,min=1,dive"`
}

type CreatePurchaseOrderItemRequest struct {
	ProductVariantID uuid.UUID `json:"product_variant_id" validate:"required,uuid"`
	Quantity         int       `json:"quantity" validate:"required,gte=1"`
	UnitPrice        float64   `json:"unit_price" validate:"gte=0"`
	UnitCost         float64   `json:"unit_cost" validate:"gte=0"`
}

type UpdatePurchaseOrderRequest struct {
	Notes        string     `json:"notes"`
	ExpectedDate *time.Time `json:"expected_date"`
}

type ReceivePurchaseOrderRequest struct {
	Items []ReceivePurchaseOrderItemRequest `json:"items" validate:"required,min=1,dive"`
}

type ReceivePurchaseOrderItemRequest struct {
	PurchaseOrderItemID uuid.UUID `json:"purchase_order_item_id" validate:"required,uuid"`
	ReceivedQty         int       `json:"received_qty" validate:"required,gte=0"`
}

// --- Stocktake DTOs ---

type StocktakeResponse struct {
	ID              uuid.UUID               `json:"id"`
	StoreID         uuid.UUID               `json:"store_id"`
	UserID          uuid.UUID               `json:"user_id"`
	Code            string                  `json:"code"`
	StocktakeNumber string                  `json:"stocktake_number"`
	Status          string                  `json:"status"`
	Notes           string                  `json:"notes"`
	TotalItems      int                     `json:"total_items"`
	MatchedItems    int                     `json:"matched_items"`
	MismatchItems   int                     `json:"mismatch_items"`
	StartedAt       *time.Time              `json:"started_at"`
	CompletedAt     *time.Time              `json:"completed_at"`
	CreatedBy       string                  `json:"created_by"`
	Items           []StocktakeItemResponse `json:"items,omitempty"`
	CreatedAt       time.Time               `json:"created_at"`
	UpdatedAt       time.Time               `json:"updated_at"`
}

type StocktakeItemResponse struct {
	ID               uuid.UUID `json:"id"`
	ProductVariantID uuid.UUID `json:"product_variant_id"`
	ProductName      string    `json:"product_name"`
	VariantName      string    `json:"variant_name"`
	SKU              string    `json:"sku"`
	Barcode          string    `json:"barcode"`
	SystemQty        int       `json:"system_qty"`
	CountedQty       int       `json:"counted_qty"`
	Difference       int       `json:"difference"`
	Notes            string    `json:"notes"`
	CountedAt        time.Time `json:"counted_at"`
}

type CreateStocktakeRequest struct {
	Notes string `json:"notes"`
}

type AddStocktakeItemRequest struct {
	ProductVariantID uuid.UUID `json:"product_variant_id" validate:"required,uuid"`
	CountedQty       int       `json:"counted_qty" validate:"gte=0"`
	Notes            string    `json:"notes"`
}

type UpdateStocktakeItemRequest struct {
	CountedQty int    `json:"counted_qty" validate:"gte=0"`
	Notes      string `json:"notes"`
}

type StocktakeListParams struct {
	Page   int    `json:"page"`
	Limit  int    `json:"limit"`
	Status string `json:"status"`
	Search string `json:"search"`
}
