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

type RoleHandler struct {
	roleService service.RoleService
	validate    *validator.CustomValidator
}

func NewRoleHandler(roleService service.RoleService, validate *validator.CustomValidator) *RoleHandler {
	return &RoleHandler{
		roleService: roleService,
		validate:    validate,
	}
}

// List godoc
// @Summary List roles
// @Tags Roles
// @Produce json
// @Success 200 {array} dto.RoleResponse
// @Security BearerAuth
// @Router /api/v1/roles [get]
func (h *RoleHandler) List(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	roles, err := h.roleService.List(c.Context(), storeID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, roles)
}

// GetByID godoc
// @Summary Get role by ID
// @Tags Roles
// @Produce json
// @Param id path string true "Role ID"
// @Success 200 {object} dto.RoleResponse
// @Security BearerAuth
// @Router /api/v1/roles/{id} [get]
func (h *RoleHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid role ID"))
	}

	result, err := h.roleService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Create godoc
// @Summary Create a new role
// @Tags Roles
// @Accept json
// @Produce json
// @Param body body dto.CreateRoleRequest true "Role data"
// @Success 201 {object} dto.RoleResponse
// @Security BearerAuth
// @Router /api/v1/roles [post]
func (h *RoleHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	storeID := middleware.GetStoreID(c)
	result, err := h.roleService.Create(c.Context(), storeID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

// Update godoc
// @Summary Update a role
// @Tags Roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Param body body dto.UpdateRoleRequest true "Role data"
// @Success 200 {object} dto.RoleResponse
// @Security BearerAuth
// @Router /api/v1/roles/{id} [put]
func (h *RoleHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid role ID"))
	}

	var req dto.UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.roleService.Update(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Delete godoc
// @Summary Delete a role
// @Tags Roles
// @Param id path string true "Role ID"
// @Success 204
// @Security BearerAuth
// @Router /api/v1/roles/{id} [delete]
func (h *RoleHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid role ID"))
	}

	if err := h.roleService.Delete(c.Context(), id); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.NoContent(c)
}
