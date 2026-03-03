package model

import (
	"time"

	"github.com/google/uuid"
)

// Notification type constants
const (
	NotifTypeNewOrder        = "new_order"
	NotifTypeLowStock        = "low_stock"
	NotifTypeWarrantyExpiry  = "warranty_expiry"
	NotifTypeWarrantyRequest = "warranty_request"
	NotifTypeDailyReport     = "daily_report"
	NotifTypeSystem          = "system"
)

// Notification severity constants
const (
	NotifSeverityInfo     = "info"
	NotifSeverityWarning  = "warning"
	NotifSeverityError    = "error"
	NotifSeverityCritical = "critical"
)

// Notification represents an in-app notification stored in MongoDB
type Notification struct {
	ID        string                 `json:"id" bson:"_id,omitempty"`
	StoreID   uuid.UUID              `json:"store_id" bson:"store_id"`
	UserID    *uuid.UUID             `json:"user_id,omitempty" bson:"user_id,omitempty"` // nil = broadcast to all store users
	Type      string                 `json:"type" bson:"type"`
	Title     string                 `json:"title" bson:"title"`
	Message   string                 `json:"message" bson:"message"`
	Severity  string                 `json:"severity" bson:"severity"`
	Data      map[string]interface{} `json:"data,omitempty" bson:"data,omitempty"`
	IsRead    bool                   `json:"is_read" bson:"is_read"`
	ReadAt    *time.Time             `json:"read_at,omitempty" bson:"read_at,omitempty"`
	CreatedAt time.Time              `json:"created_at" bson:"created_at"`
}
