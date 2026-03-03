package model

import (
	"time"

	"github.com/google/uuid"
)

// Warranty status constants
const (
	WarrantyStatusActive  = "active"
	WarrantyStatusExpired = "expired"
	WarrantyStatusVoided  = "voided"
)

// Warranty claim status constants
const (
	ClaimStatusPending    = "pending"
	ClaimStatusReceived   = "received"
	ClaimStatusProcessing = "processing"
	ClaimStatusCompleted  = "completed"
	ClaimStatusRejected   = "rejected"
	ClaimStatusReturned   = "returned"
)

// Warranty represents a product warranty
type Warranty struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	StoreID          uuid.UUID  `json:"store_id" db:"store_id"`
	OrderItemID      *uuid.UUID `json:"order_item_id" db:"order_item_id"`
	CustomerID       uuid.UUID  `json:"customer_id" db:"customer_id"`
	ProductVariantID uuid.UUID  `json:"product_variant_id" db:"product_variant_id"`
	WarrantyCode     string    `json:"warranty_code" db:"warranty_code"`
	SerialNumber     string    `json:"serial_number" db:"serial_number"`
	StartDate        time.Time `json:"start_date" db:"start_date"`
	EndDate          time.Time `json:"end_date" db:"end_date"`
	WarrantyMonths   int       `json:"warranty_months" db:"warranty_months"`
	Status           string    `json:"status" db:"status"`
	Terms            string    `json:"terms" db:"terms"`
	Notes            string    `json:"notes" db:"notes"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`

	// Relations
	Customer       *Customer       `json:"customer,omitempty" db:"-"`
	ProductVariant *ProductVariant `json:"product_variant,omitempty" db:"-"`
	Claims         []WarrantyClaim `json:"claims,omitempty" db:"-"`
}

// IsValid checks if the warranty is still valid
func (w *Warranty) IsValid() bool {
	return w.Status == WarrantyStatusActive && time.Now().Before(w.EndDate)
}

// DaysRemaining returns the number of days remaining on the warranty
func (w *Warranty) DaysRemaining() int {
	if !w.IsValid() {
		return 0
	}
	return int(time.Until(w.EndDate).Hours() / 24)
}

// WarrantyClaim represents a warranty claim/request
type WarrantyClaim struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	WarrantyID      uuid.UUID  `json:"warranty_id" db:"warranty_id"`
	StoreID         uuid.UUID  `json:"store_id" db:"store_id"`
	ClaimNumber     string     `json:"claim_number" db:"claim_number"`
	Issue           string     `json:"issue" db:"issue"`
	Description     string     `json:"description" db:"description"`
	Status          string     `json:"status" db:"status"`
	Resolution      string     `json:"resolution" db:"resolution"`
	TechnicianNotes string     `json:"technician_notes" db:"technician_notes"`
	ReceivedDate    *time.Time `json:"received_date" db:"received_date"`
	CompletedDate   *time.Time `json:"completed_date" db:"completed_date"`
	ReturnedDate    *time.Time `json:"returned_date" db:"returned_date"`
	Images          StringArr  `json:"images" db:"images"`
	CreatedBy       uuid.UUID  `json:"created_by" db:"created_by"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`

	// Relations
	Warranty *Warranty `json:"warranty,omitempty" db:"-"`
}

// Stocktake represents a physical inventory count
type Stocktake struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	StoreID       uuid.UUID  `json:"store_id" db:"store_id"`
	UserID        uuid.UUID  `json:"user_id" db:"user_id"`
	Code          string     `json:"code" db:"code"`
	Status        string     `json:"status" db:"status"` // draft, in_progress, completed, cancelled
	Notes         string     `json:"notes" db:"notes"`
	TotalItems    int        `json:"total_items" db:"total_items"`
	MatchedItems  int        `json:"matched_items" db:"matched_items"`
	MismatchItems int        `json:"mismatch_items" db:"mismatch_items"`
	StartedAt     *time.Time `json:"started_at" db:"started_at"`
	CompletedAt   *time.Time `json:"completed_at" db:"completed_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`

	// Relations
	Items []StocktakeItem `json:"items,omitempty" db:"-"`
}

// StocktakeItem represents a single item count in a stocktake
type StocktakeItem struct {
	ID               uuid.UUID `json:"id" db:"id"`
	StocktakeID      uuid.UUID `json:"stocktake_id" db:"stocktake_id"`
	ProductVariantID uuid.UUID `json:"product_variant_id" db:"product_variant_id"`
	SystemQty        int       `json:"system_qty" db:"system_qty"`
	CountedQty       int       `json:"counted_qty" db:"counted_qty"`
	Difference       int       `json:"difference" db:"difference"`
	Notes            string    `json:"notes" db:"notes"`
	CountedAt        time.Time `json:"counted_at" db:"counted_at"`
}
