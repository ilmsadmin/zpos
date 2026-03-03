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

type OrderHandler struct {
	orderService service.OrderService
	validate     *validator.CustomValidator
}

func NewOrderHandler(orderService service.OrderService, validate *validator.CustomValidator) *OrderHandler {
	return &OrderHandler{orderService: orderService, validate: validate}
}

func (h *OrderHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	claims := middleware.GetClaims(c)
	storeID := middleware.GetStoreID(c)

	result, err := h.orderService.Create(c.Context(), storeID, claims.UserID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

func (h *OrderHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid order ID"))
	}
	result, err := h.orderService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

func (h *OrderHandler) List(c *fiber.Ctx) error {
	var params dto.OrderListParams
	if err := c.QueryParser(&params); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid query parameters"))
	}
	storeID := middleware.GetStoreID(c)

	orders, total, err := h.orderService.List(c.Context(), storeID, &params)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}
	return response.Paginated(c, orders, page, limit, total)
}

func (h *OrderHandler) Cancel(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid order ID"))
	}
	var body struct {
		Reason string `json:"reason"`
	}
	_ = c.BodyParser(&body)

	if err := h.orderService.Cancel(c.Context(), id, body.Reason); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, nil, "Order cancelled")
}

func (h *OrderHandler) Refund(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid order ID"))
	}
	var body struct {
		Reason string `json:"reason"`
	}
	_ = c.BodyParser(&body)

	if err := h.orderService.Refund(c.Context(), id, body.Reason); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, nil, "Order refunded")
}

func (h *OrderHandler) DailySummary(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	date := c.Query("date")
	summary, err := h.orderService.GetDailySummary(c.Context(), storeID, date)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, summary)
}

func (h *OrderHandler) GetCustomerPurchasedItems(c *fiber.Ctx) error {
	customerID, err := uuid.Parse(c.Params("customer_id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid customer ID"))
	}

	storeID := middleware.GetStoreID(c)
	items, err := h.orderService.GetCustomerPurchasedItems(c.Context(), storeID, customerID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, items)
}
