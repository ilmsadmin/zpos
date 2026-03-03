package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/middleware"
	"github.com/zplus/pos/internal/service"
	"github.com/zplus/pos/internal/validator"
	appErrors "github.com/zplus/pos/pkg/errors"
	"github.com/zplus/pos/pkg/response"
)

type AuthHandler struct {
	authService service.AuthService
	validate    *validator.CustomValidator
}

func NewAuthHandler(authService service.AuthService, validate *validator.CustomValidator) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		validate:    validate,
	}
}

// Login godoc
// @Summary User login
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body dto.LoginRequest true "Login credentials"
// @Success 200 {object} dto.LoginResponse
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}

	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.authService.Login(c.Context(), &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}

	return response.Success(c, result, "Login successful")
}

// Register godoc
// @Summary Register new user
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body dto.RegisterRequest true "Registration data"
// @Success 201 {object} dto.UserResponse
// @Router /api/v1/auth/register [post]
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}

	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	storeID := middleware.GetStoreID(c)
	result, err := h.authService.Register(c.Context(), storeID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}

	return response.Created(c, result, "Registration successful")
}

// RefreshToken godoc
// @Summary Refresh access token
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body dto.RefreshTokenRequest true "Refresh token"
// @Success 200 {object} dto.LoginResponse
// @Router /api/v1/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var req dto.RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}

	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.authService.RefreshToken(c.Context(), &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}

	return response.Success(c, result, "Token refreshed")
}

// ChangePassword godoc
// @Summary Change user password
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body dto.ChangePasswordRequest true "Password change data"
// @Success 200
// @Security BearerAuth
// @Router /api/v1/auth/change-password [post]
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	var req dto.ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}

	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	claims := middleware.GetClaims(c)
	if claims == nil {
		return response.Error(c, appErrors.Unauthorized(""))
	}

	if err := h.authService.ChangePassword(c.Context(), claims.UserID, &req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	return response.Success(c, nil, "Password changed successfully")
}

// GetProfile godoc
// @Summary Get current user profile
// @Tags Auth
// @Produce json
// @Success 200 {object} dto.UserResponse
// @Security BearerAuth
// @Router /api/v1/auth/profile [get]
func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	if claims == nil {
		return response.Error(c, appErrors.Unauthorized(""))
	}

	// Use a simple user service lookup here; for now, return claims as profile
	return response.Success(c, fiber.Map{
		"user_id":   claims.UserID,
		"store_id":  claims.StoreID,
		"role_id":   claims.RoleID,
		"role_name": claims.RoleName,
	})
}

// Logout godoc
// @Summary Logout user
// @Tags Auth
// @Success 200
// @Security BearerAuth
// @Router /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	if claims == nil {
		return response.Error(c, appErrors.Unauthorized(""))
	}

	if err := h.authService.Logout(c.Context(), claims.UserID); err != nil {
		return response.ErrorFromErr(c, err)
	}

	return response.Success(c, nil, "Logged out successfully")
}
