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

type SupplierHandler struct {
	supplierService service.SupplierService
	validate        *validator.CustomValidator
}

func NewSupplierHandler(supplierService service.SupplierService, validate *validator.CustomValidator) *SupplierHandler {
	return &SupplierHandler{
		supplierService: supplierService,
		validate:        validate,
	}
}

// List godoc
// @Summary List suppliers
// @Tags Suppliers
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Param search query string false "Search term"
// @Success 200 {array} dto.SupplierResponse
// @Security BearerAuth
// @Router /api/v1/suppliers [get]
func (h *SupplierHandler) List(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	search := c.Query("search")

	storeID := middleware.GetStoreID(c)
	suppliers, total, err := h.supplierService.List(c.Context(), storeID, page, limit, search)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, suppliers, page, limit, total)
}

// GetByID godoc
// @Summary Get supplier by ID
// @Tags Suppliers
// @Produce json
// @Param id path string true "Supplier ID"
// @Success 200 {object} dto.SupplierResponse
// @Security BearerAuth
// @Router /api/v1/suppliers/{id} [get]
func (h *SupplierHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid supplier ID"))
	}

	result, err := h.supplierService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Create godoc
// @Summary Create a new supplier
// @Tags Suppliers
// @Accept json
// @Produce json
// @Param body body dto.CreateSupplierRequest true "Supplier data"
// @Success 201 {object} dto.SupplierResponse
// @Security BearerAuth
// @Router /api/v1/suppliers [post]
func (h *SupplierHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateSupplierRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	storeID := middleware.GetStoreID(c)
	result, err := h.supplierService.Create(c.Context(), storeID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

// Update godoc
// @Summary Update a supplier
// @Tags Suppliers
// @Accept json
// @Produce json
// @Param id path string true "Supplier ID"
// @Param body body dto.UpdateSupplierRequest true "Supplier data"
// @Success 200 {object} dto.SupplierResponse
// @Security BearerAuth
// @Router /api/v1/suppliers/{id} [put]
func (h *SupplierHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid supplier ID"))
	}

	var req dto.UpdateSupplierRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.supplierService.Update(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Delete godoc
// @Summary Delete a supplier
// @Tags Suppliers
// @Param id path string true "Supplier ID"
// @Success 204
// @Security BearerAuth
// @Router /api/v1/suppliers/{id} [delete]
func (h *SupplierHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid supplier ID"))
	}

	if err := h.supplierService.Delete(c.Context(), id); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.NoContent(c)
}
