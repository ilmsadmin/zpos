package dto

import (
	"time"

	"github.com/google/uuid"
)

// --- Notification DTOs ---

type NotificationResponse struct {
	ID        string                 `json:"id"`
	StoreID   uuid.UUID              `json:"store_id"`
	UserID    *uuid.UUID             `json:"user_id,omitempty"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Message   string                 `json:"message"`
	Severity  string                 `json:"severity"`
	Data      map[string]interface{} `json:"data,omitempty"`
	IsRead    bool                   `json:"is_read"`
	ReadAt    *time.Time             `json:"read_at,omitempty"`
	CreatedAt time.Time              `json:"created_at"`
}

type NotificationListParams struct {
	Page   int    `query:"page"`
	Limit  int    `query:"limit"`
	Type   string `query:"type"`
	IsRead *bool  `query:"is_read"`
}

type CreateNotificationRequest struct {
	StoreID  uuid.UUID              `json:"store_id"`
	UserID   *uuid.UUID             `json:"user_id,omitempty"`
	Type     string                 `json:"type"`
	Title    string                 `json:"title"`
	Message  string                 `json:"message"`
	Severity string                 `json:"severity"`
	Data     map[string]interface{} `json:"data,omitempty"`
}

// NotificationPreferences represents user notification preference settings
type NotificationPreferences struct {
	NewOrder        bool `json:"new_order"`
	LowStock        bool `json:"low_stock"`
	WarrantyExpiry  bool `json:"warranty_expiry"`
	WarrantyRequest bool `json:"warranty_request"`
	DailyReport     bool `json:"daily_report"`
}

type UpdateNotificationPrefsRequest struct {
	Preferences NotificationPreferences `json:"preferences" validate:"required"`
}
