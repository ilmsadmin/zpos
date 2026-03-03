package model

import (
	"time"

	"github.com/google/uuid"
)

// Order status constants
const (
	OrderStatusDraft     = "draft"
	OrderStatusPending   = "pending"
	OrderStatusConfirmed = "confirmed"
	OrderStatusCompleted = "completed"
	OrderStatusCancelled = "cancelled"
	OrderStatusRefunded  = "refunded"
)

// Payment method constants
const (
	PaymentMethodCash     = "cash"
	PaymentMethodCard     = "card"
	PaymentMethodTransfer = "transfer"
	PaymentMethodMomo     = "momo"
	PaymentMethodZaloPay  = "zalopay"
	PaymentMethodVNPay    = "vnpay"
)

// Payment status constants
const (
	PaymentStatusPending   = "pending"
	PaymentStatusCompleted = "completed"
	PaymentStatusFailed    = "failed"
	PaymentStatusRefunded  = "refunded"
)

// Order represents a sales order
type Order struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	StoreID        uuid.UUID  `json:"store_id" db:"store_id"`
	CustomerID     *uuid.UUID `json:"customer_id" db:"customer_id"`
	UserID         uuid.UUID  `json:"user_id" db:"user_id"`
	OrderNumber    string     `json:"order_number" db:"order_number"`
	Status         string     `json:"status" db:"status"`
	SubTotal       float64    `json:"sub_total" db:"sub_total"`
	DiscountType   string     `json:"discount_type" db:"discount_type"` // percentage, fixed
	DiscountValue  float64    `json:"discount_value" db:"discount_value"`
	DiscountAmount float64    `json:"discount_amount" db:"discount_amount"`
	TaxAmount      float64    `json:"tax_amount" db:"tax_amount"`
	TotalAmount    float64    `json:"total_amount" db:"total_amount"`
	PaidAmount     float64    `json:"paid_amount" db:"paid_amount"`
	ChangeAmount   float64    `json:"change_amount" db:"change_amount"`
	Notes          string     `json:"notes" db:"notes"`
	POSSessionID   *uuid.UUID `json:"pos_session_id" db:"pos_session_id"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`

	// Relations
	Customer *Customer   `json:"customer,omitempty" db:"-"`
	User     *User       `json:"user,omitempty" db:"-"`
	Items    []OrderItem `json:"items,omitempty" db:"-"`
	Payments []Payment   `json:"payments,omitempty" db:"-"`
}

// OrderItem represents a line item in an order
type OrderItem struct {
	ID               uuid.UUID `json:"id" db:"id"`
	OrderID          uuid.UUID `json:"order_id" db:"order_id"`
	ProductVariantID uuid.UUID `json:"product_variant_id" db:"product_variant_id"`
	ProductName      string    `json:"product_name" db:"product_name"`
	VariantName      string    `json:"variant_name" db:"variant_name"`
	SKU              string    `json:"sku" db:"sku"`
	Quantity         int       `json:"quantity" db:"quantity"`
	UnitPrice        float64   `json:"unit_price" db:"unit_price"`
	DiscountType     string    `json:"discount_type" db:"discount_type"`
	DiscountValue    float64   `json:"discount_value" db:"discount_value"`
	DiscountAmount   float64   `json:"discount_amount" db:"discount_amount"`
	TotalPrice       float64   `json:"total_price" db:"total_price"`
	WarrantyMonths   int       `json:"warranty_months" db:"warranty_months"`
	Notes            string    `json:"notes" db:"notes"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`

	// Relations
	ProductVariant *ProductVariant `json:"product_variant,omitempty" db:"-"`
}

// Payment represents a payment for an order
type Payment struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	OrderID       uuid.UUID  `json:"order_id" db:"order_id"`
	Method        string     `json:"method" db:"method"`
	Amount        float64    `json:"amount" db:"amount"`
	Status        string     `json:"status" db:"status"`
	TransactionID string     `json:"transaction_id" db:"transaction_id"`
	Notes         string     `json:"notes" db:"notes"`
	PaidAt        *time.Time `json:"paid_at" db:"paid_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

// Supplier represents a product supplier
type Supplier struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	StoreID     uuid.UUID  `json:"store_id" db:"store_id"`
	Name        string     `json:"name" db:"name"`
	ContactName string     `json:"contact_name" db:"contact_name"`
	Phone       string     `json:"phone" db:"phone"`
	Email       string     `json:"email" db:"email"`
	Address     string     `json:"address" db:"address"`
	TaxCode     string     `json:"tax_code" db:"tax_code"`
	BankAccount string     `json:"bank_account" db:"bank_account"`
	BankName    string     `json:"bank_name" db:"bank_name"`
	Notes       string     `json:"notes" db:"notes"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// PurchaseOrder represents a purchase order from a supplier
type PurchaseOrder struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	StoreID      uuid.UUID  `json:"store_id" db:"store_id"`
	SupplierID   uuid.UUID  `json:"supplier_id" db:"supplier_id"`
	UserID       uuid.UUID  `json:"user_id" db:"user_id"`
	OrderNumber  string     `json:"order_number" db:"order_number"`
	Status       string     `json:"status" db:"status"` // draft, confirmed, received, cancelled
	TotalAmount  float64    `json:"total_amount" db:"total_amount"`
	Notes        string     `json:"notes" db:"notes"`
	ExpectedDate *time.Time `json:"expected_date" db:"expected_date"`
	ReceivedDate *time.Time `json:"received_date" db:"received_date"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`

	// Relations
	Supplier *Supplier           `json:"supplier,omitempty" db:"-"`
	Items    []PurchaseOrderItem `json:"items,omitempty" db:"-"`
}

// PurchaseOrderItem represents a line item in a purchase order
type PurchaseOrderItem struct {
	ID               uuid.UUID `json:"id" db:"id"`
	PurchaseOrderID  uuid.UUID `json:"purchase_order_id" db:"purchase_order_id"`
	ProductVariantID uuid.UUID `json:"product_variant_id" db:"product_variant_id"`
	Quantity         int       `json:"quantity" db:"quantity"`
	ReceivedQty      int       `json:"received_qty" db:"received_qty"`
	UnitPrice        float64   `json:"unit_price" db:"unit_price"`
	TotalPrice       float64   `json:"total_price" db:"total_price"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

// POSSession represents a POS session (cash register shift)
type POSSession struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	StoreID        uuid.UUID  `json:"store_id" db:"store_id"`
	UserID         uuid.UUID  `json:"user_id" db:"user_id"`
	OpeningAmount  float64    `json:"opening_amount" db:"opening_amount"`
	ClosingAmount  *float64   `json:"closing_amount" db:"closing_amount"`
	ExpectedAmount *float64   `json:"expected_amount" db:"expected_amount"`
	Difference     *float64   `json:"difference" db:"difference"`
	TotalSales     float64    `json:"total_sales" db:"total_sales"`
	TotalOrders    int        `json:"total_orders" db:"total_orders"`
	Notes          string     `json:"notes" db:"notes"`
	Status         string     `json:"status" db:"status"` // open, closed
	OpenedAt       time.Time  `json:"opened_at" db:"opened_at"`
	ClosedAt       *time.Time `json:"closed_at" db:"closed_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}
