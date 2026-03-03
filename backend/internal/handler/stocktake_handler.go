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

type StocktakeHandler struct {
	stocktakeService service.StocktakeService
	validate         *validator.CustomValidator
}

func NewStocktakeHandler(stocktakeService service.StocktakeService, validate *validator.CustomValidator) *StocktakeHandler {
	return &StocktakeHandler{stocktakeService: stocktakeService, validate: validate}
}

func (h *StocktakeHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateStocktakeRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}

	storeID := middleware.GetStoreID(c)
	claims := middleware.GetClaims(c)

	result, err := h.stocktakeService.Create(c.Context(), storeID, claims.UserID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

func (h *StocktakeHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid stocktake ID"))
	}

	result, err := h.stocktakeService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

func (h *StocktakeHandler) List(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	results, total, err := h.stocktakeService.List(c.Context(), storeID, page, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, results, page, limit, total)
}

func (h *StocktakeHandler) AddItem(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid stocktake ID"))
	}

	var req dto.AddStocktakeItemRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.stocktakeService.AddItem(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

func (h *StocktakeHandler) Complete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid stocktake ID"))
	}

	result, err := h.stocktakeService.Complete(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result, "Stocktake completed and inventory adjusted")
}
