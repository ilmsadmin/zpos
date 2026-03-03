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

type InventoryHandler struct {
	inventoryService service.InventoryService
	validate         *validator.CustomValidator
}

func NewInventoryHandler(inventoryService service.InventoryService, validate *validator.CustomValidator) *InventoryHandler {
	return &InventoryHandler{
		inventoryService: inventoryService,
		validate:         validate,
	}
}

// GetByVariant godoc
// @Summary Get inventory for a specific variant
// @Tags Inventory
// @Produce json
// @Param variant_id path string true "Product Variant ID"
// @Success 200 {object} dto.InventoryResponse
// @Security BearerAuth
// @Router /api/v1/inventory/{variant_id} [get]
func (h *InventoryHandler) GetByVariant(c *fiber.Ctx) error {
	variantID, err := uuid.Parse(c.Params("variant_id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid variant ID"))
	}

	storeID := middleware.GetStoreID(c)
	result, err := h.inventoryService.GetByVariant(c.Context(), storeID, variantID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Adjust godoc
// @Summary Adjust inventory for a single variant
// @Tags Inventory
// @Accept json
// @Produce json
// @Param body body dto.AdjustInventoryRequest true "Adjustment data"
// @Success 200
// @Security BearerAuth
// @Router /api/v1/inventory/adjust [post]
func (h *InventoryHandler) Adjust(c *fiber.Ctx) error {
	var req dto.AdjustInventoryRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	claims := middleware.GetClaims(c)
	storeID := middleware.GetStoreID(c)
	if err := h.inventoryService.AdjustStock(c.Context(), storeID, claims.UserID, &req); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, nil, "Inventory adjusted successfully")
}

// BulkAdjust godoc
// @Summary Bulk adjust inventory
// @Tags Inventory
// @Accept json
// @Produce json
// @Param body body dto.BulkAdjustInventoryRequest true "Bulk adjustment data"
// @Success 200
// @Security BearerAuth
// @Router /api/v1/inventory/adjust/bulk [post]
func (h *InventoryHandler) BulkAdjust(c *fiber.Ctx) error {
	var req dto.BulkAdjustInventoryRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	claims := middleware.GetClaims(c)
	storeID := middleware.GetStoreID(c)
	if err := h.inventoryService.BulkAdjust(c.Context(), storeID, claims.UserID, &req); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, nil, "Bulk inventory adjustment completed")
}

// GetLowStock godoc
// @Summary Get low stock items
// @Tags Inventory
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Success 200 {array} dto.InventoryResponse
// @Security BearerAuth
// @Router /api/v1/inventory/low-stock [get]
func (h *InventoryHandler) GetLowStock(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	storeID := middleware.GetStoreID(c)
	items, total, err := h.inventoryService.GetLowStock(c.Context(), storeID, page, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, items, page, limit, total)
}

// GetMovements godoc
// @Summary Get inventory movements for a variant
// @Tags Inventory
// @Produce json
// @Param variant_id path string true "Product Variant ID"
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Success 200 {array} object
// @Security BearerAuth
// @Router /api/v1/inventory/{variant_id}/movements [get]
func (h *InventoryHandler) GetMovements(c *fiber.Ctx) error {
	variantID, err := uuid.Parse(c.Params("variant_id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid variant ID"))
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	storeID := middleware.GetStoreID(c)
	movements, total, err := h.inventoryService.GetMovements(c.Context(), storeID, variantID, page, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, movements, page, limit, total)
}
