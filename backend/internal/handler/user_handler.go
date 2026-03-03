package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/middleware"
	"github.com/zplus/pos/internal/service"
	"github.com/zplus/pos/internal/validator"
	appErrors "github.com/zplus/pos/pkg/errors"
	"github.com/zplus/pos/pkg/response"
)

type UserHandler struct {
	userService service.UserService
	validate    *validator.CustomValidator
}

func NewUserHandler(userService service.UserService, validate *validator.CustomValidator) *UserHandler {
	return &UserHandler{
		userService: userService,
		validate:    validate,
	}
}

// List godoc
// @Summary List users
// @Tags Users
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Success 200 {array} dto.UserResponse
// @Security BearerAuth
// @Router /api/v1/users [get]
func (h *UserHandler) List(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	storeID := middleware.GetStoreID(c)
	users, total, err := h.userService.List(c.Context(), storeID, page, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, users, page, limit, total)
}

// GetByID godoc
// @Summary Get user by ID
// @Tags Users
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} dto.UserResponse
// @Security BearerAuth
// @Router /api/v1/users/{id} [get]
func (h *UserHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid user ID"))
	}

	result, err := h.userService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Create godoc
// @Summary Create a new user
// @Tags Users
// @Accept json
// @Produce json
// @Param body body dto.CreateUserRequest true "User data"
// @Success 201 {object} dto.UserResponse
// @Security BearerAuth
// @Router /api/v1/users [post]
func (h *UserHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	storeID := middleware.GetStoreID(c)
	result, err := h.userService.Create(c.Context(), storeID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

// Update godoc
// @Summary Update a user
// @Tags Users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param body body dto.UpdateUserRequest true "User data"
// @Success 200 {object} dto.UserResponse
// @Security BearerAuth
// @Router /api/v1/users/{id} [put]
func (h *UserHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid user ID"))
	}

	var req dto.UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.userService.Update(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Delete godoc
// @Summary Delete a user (soft delete)
// @Tags Users
// @Param id path string true "User ID"
// @Success 204
// @Security BearerAuth
// @Router /api/v1/users/{id} [delete]
func (h *UserHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid user ID"))
	}

	if err := h.userService.Delete(c.Context(), id); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.NoContent(c)
}
