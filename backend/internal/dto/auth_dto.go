package dto

import (
	"time"

	"github.com/google/uuid"
)

// --- Auth DTOs ---

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
}

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,password_strength"`
	FullName string `json:"full_name" validate:"required,min=2,max=100"`
	Phone    string `json:"phone" validate:"omitempty,phone_vn"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,password_strength"`
}

type UpdateProfileRequest struct {
	FullName string `json:"full_name" validate:"omitempty,min=2,max=100"`
	Phone    string `json:"phone" validate:"omitempty,phone_vn"`
}

// --- User DTOs ---

type UserResponse struct {
	ID          uuid.UUID     `json:"id"`
	StoreID     uuid.UUID     `json:"store_id"`
	Email       string        `json:"email"`
	FullName    string        `json:"full_name"`
	Phone       string        `json:"phone"`
	AvatarURL   string        `json:"avatar_url"`
	IsActive    bool          `json:"is_active"`
	Role        *RoleResponse `json:"role,omitempty"`
	LastLoginAt *time.Time    `json:"last_login_at"`
	CreatedAt   time.Time     `json:"created_at"`
}

type CreateUserRequest struct {
	Email    string    `json:"email" validate:"required,email"`
	Password string    `json:"password" validate:"required,password_strength"`
	FullName string    `json:"full_name" validate:"required,min=2,max=100"`
	Phone    string    `json:"phone" validate:"omitempty,phone_vn"`
	RoleID   uuid.UUID `json:"role_id" validate:"required,uuid"`
	IsActive bool      `json:"is_active"`
}

type UpdateUserRequest struct {
	FullName string    `json:"full_name" validate:"omitempty,min=2,max=100"`
	Phone    string    `json:"phone" validate:"omitempty,phone_vn"`
	RoleID   uuid.UUID `json:"role_id" validate:"omitempty,uuid"`
	IsActive *bool     `json:"is_active"`
}

// --- Role DTOs ---

type RoleResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	DisplayName string    `json:"display_name"`
	Description string    `json:"description"`
	Permissions []string  `json:"permissions"`
	IsSystem    bool      `json:"is_system"`
}

type CreateRoleRequest struct {
	Name        string   `json:"name" validate:"required,min=2,max=50"`
	DisplayName string   `json:"display_name" validate:"required,min=2,max=100"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions" validate:"required,min=1"`
}

type UpdateRoleRequest struct {
	DisplayName string   `json:"display_name" validate:"omitempty,min=2,max=100"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

// --- Store DTOs ---

type StoreResponse struct {
	ID       uuid.UUID              `json:"id"`
	Name     string                 `json:"name"`
	Code     string                 `json:"code"`
	Address  string                 `json:"address"`
	Phone    string                 `json:"phone"`
	Email    string                 `json:"email"`
	LogoURL  string                 `json:"logo_url"`
	IsActive bool                   `json:"is_active"`
	Settings map[string]interface{} `json:"settings"`
}

type UpdateStoreRequest struct {
	Name     string                 `json:"name" validate:"omitempty,min=2,max=100"`
	Address  string                 `json:"address"`
	Phone    string                 `json:"phone" validate:"omitempty,phone_vn"`
	Email    string                 `json:"email" validate:"omitempty,email"`
	Settings map[string]interface{} `json:"settings"`
}
