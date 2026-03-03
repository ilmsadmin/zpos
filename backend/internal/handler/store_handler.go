package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/service"
	"github.com/zplus/pos/internal/validator"
	appErrors "github.com/zplus/pos/pkg/errors"
	"github.com/zplus/pos/pkg/response"
)

type StoreHandler struct {
	storeService service.StoreService
	validate     *validator.CustomValidator
}

func NewStoreHandler(storeService service.StoreService, validate *validator.CustomValidator) *StoreHandler {
	return &StoreHandler{
		storeService: storeService,
		validate:     validate,
	}
}

// GetAll godoc
// @Summary List all stores
// @Tags Stores
// @Produce json
// @Success 200 {array} dto.StoreResponse
// @Security BearerAuth
// @Router /api/v1/stores [get]
func (h *StoreHandler) GetAll(c *fiber.Ctx) error {
	stores, err := h.storeService.GetAll(c.Context())
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, stores)
}

// GetByID godoc
// @Summary Get store by ID
// @Tags Stores
// @Produce json
// @Param id path string true "Store ID"
// @Success 200 {object} dto.StoreResponse
// @Security BearerAuth
// @Router /api/v1/stores/{id} [get]
func (h *StoreHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid store ID"))
	}

	result, err := h.storeService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Update godoc
// @Summary Update store settings
// @Tags Stores
// @Accept json
// @Produce json
// @Param id path string true "Store ID"
// @Param body body dto.UpdateStoreRequest true "Store data"
// @Success 200 {object} dto.StoreResponse
// @Security BearerAuth
// @Router /api/v1/stores/{id} [put]
func (h *StoreHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid store ID"))
	}

	var req dto.UpdateStoreRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.storeService.Update(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}
