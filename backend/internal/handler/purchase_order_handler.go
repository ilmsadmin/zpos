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

type PurchaseOrderHandler struct {
	poService service.PurchaseOrderService
	validate  *validator.CustomValidator
}

func NewPurchaseOrderHandler(poService service.PurchaseOrderService, validate *validator.CustomValidator) *PurchaseOrderHandler {
	return &PurchaseOrderHandler{poService: poService, validate: validate}
}

func (h *PurchaseOrderHandler) Create(c *fiber.Ctx) error {
	var req dto.CreatePurchaseOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	storeID := middleware.GetStoreID(c)
	claims := middleware.GetClaims(c)

	result, err := h.poService.Create(c.Context(), storeID, claims.UserID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

func (h *PurchaseOrderHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid purchase order ID"))
	}

	result, err := h.poService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

func (h *PurchaseOrderHandler) List(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	status := c.Query("status")

	results, total, err := h.poService.List(c.Context(), storeID, page, limit, status)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, results, page, limit, total)
}

func (h *PurchaseOrderHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid purchase order ID"))
	}

	var req dto.UpdatePurchaseOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}

	result, err := h.poService.Update(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

func (h *PurchaseOrderHandler) Approve(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid purchase order ID"))
	}

	if err := h.poService.UpdateStatus(c.Context(), id, "confirmed"); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, nil, "Purchase order approved")
}

func (h *PurchaseOrderHandler) Receive(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid purchase order ID"))
	}

	var req dto.ReceivePurchaseOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	claims := middleware.GetClaims(c)
	result, err := h.poService.Receive(c.Context(), id, claims.UserID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}
