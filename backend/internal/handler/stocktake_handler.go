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
	params := &dto.StocktakeListParams{
		Page:   c.QueryInt("page", 1),
		Limit:  c.QueryInt("limit", 20),
		Status: c.Query("status"),
		Search: c.Query("search"),
	}

	results, total, err := h.stocktakeService.List(c.Context(), storeID, params)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, results, params.Page, params.Limit, total)
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

func (h *StocktakeHandler) AddItemByBarcode(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid stocktake ID"))
	}

	var req struct {
		Barcode    string `json:"barcode"`
		CountedQty int    `json:"counted_qty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if req.Barcode == "" {
		return response.Error(c, appErrors.BadRequest("Barcode is required"))
	}

	result, err := h.stocktakeService.AddItemByBarcode(c.Context(), id, req.Barcode, req.CountedQty)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

func (h *StocktakeHandler) UpdateItem(c *fiber.Ctx) error {
	stocktakeID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid stocktake ID"))
	}

	itemID, err := uuid.Parse(c.Params("itemId"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid item ID"))
	}

	var req dto.UpdateStocktakeItemRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.stocktakeService.UpdateItem(c.Context(), stocktakeID, itemID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

func (h *StocktakeHandler) DeleteItem(c *fiber.Ctx) error {
	stocktakeID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid stocktake ID"))
	}

	itemID, err := uuid.Parse(c.Params("itemId"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid item ID"))
	}

	if err := h.stocktakeService.DeleteItem(c.Context(), stocktakeID, itemID); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, nil, "Item deleted successfully")
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

func (h *StocktakeHandler) Cancel(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid stocktake ID"))
	}

	result, err := h.stocktakeService.Cancel(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result, "Stocktake cancelled")
}
