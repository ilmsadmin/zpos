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

type CustomerHandler struct {
	customerService service.CustomerService
	validate        *validator.CustomValidator
}

func NewCustomerHandler(customerService service.CustomerService, validate *validator.CustomValidator) *CustomerHandler {
	return &CustomerHandler{
		customerService: customerService,
		validate:        validate,
	}
}

// List godoc
// @Summary List customers
// @Tags Customers
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Param search query string false "Search term"
// @Success 200 {array} dto.CustomerResponse
// @Security BearerAuth
// @Router /api/v1/customers [get]
func (h *CustomerHandler) List(c *fiber.Ctx) error {
	var params dto.CustomerListParams
	if err := c.QueryParser(&params); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid query parameters"))
	}

	storeID := middleware.GetStoreID(c)
	customers, total, err := h.customerService.List(c.Context(), storeID, &params)
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
	return response.Paginated(c, customers, page, limit, total)
}

// GetByID godoc
// @Summary Get customer by ID
// @Tags Customers
// @Produce json
// @Param id path string true "Customer ID"
// @Success 200 {object} dto.CustomerResponse
// @Security BearerAuth
// @Router /api/v1/customers/{id} [get]
func (h *CustomerHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid customer ID"))
	}

	result, err := h.customerService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Create godoc
// @Summary Create a new customer
// @Tags Customers
// @Accept json
// @Produce json
// @Param body body dto.CreateCustomerRequest true "Customer data"
// @Success 201 {object} dto.CustomerResponse
// @Security BearerAuth
// @Router /api/v1/customers [post]
func (h *CustomerHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateCustomerRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	storeID := middleware.GetStoreID(c)
	result, err := h.customerService.Create(c.Context(), storeID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

// Update godoc
// @Summary Update a customer
// @Tags Customers
// @Accept json
// @Produce json
// @Param id path string true "Customer ID"
// @Param body body dto.UpdateCustomerRequest true "Customer data"
// @Success 200 {object} dto.CustomerResponse
// @Security BearerAuth
// @Router /api/v1/customers/{id} [put]
func (h *CustomerHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid customer ID"))
	}

	var req dto.UpdateCustomerRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.customerService.Update(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Delete godoc
// @Summary Delete a customer
// @Tags Customers
// @Param id path string true "Customer ID"
// @Success 204
// @Security BearerAuth
// @Router /api/v1/customers/{id} [delete]
func (h *CustomerHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid customer ID"))
	}

	if err := h.customerService.Delete(c.Context(), id); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.NoContent(c)
}

// Search godoc
// @Summary Search customers
// @Tags Customers
// @Produce json
// @Param q query string true "Search query (name, phone, email)"
// @Success 200 {array} dto.CustomerResponse
// @Security BearerAuth
// @Router /api/v1/customers/search [get]
func (h *CustomerHandler) Search(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return response.Error(c, appErrors.BadRequest("Search query is required"))
	}

	storeID := middleware.GetStoreID(c)
	results, err := h.customerService.Search(c.Context(), storeID, query)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, results)
}

// GetOrders godoc
// @Summary Get customer order history
// @Tags Customers
// @Produce json
// @Param id path string true "Customer ID"
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Success 200 {array} dto.OrderResponse
// @Security BearerAuth
// @Router /api/v1/customers/{id}/orders [get]
func (h *CustomerHandler) GetOrders(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid customer ID"))
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	orders, total, err := h.customerService.GetOrders(c.Context(), id, page, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, orders, page, limit, total)
}

// GetWarranties godoc
// @Summary Get customer warranties
// @Tags Customers
// @Produce json
// @Param id path string true "Customer ID"
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Success 200 {array} dto.WarrantyResponse
// @Security BearerAuth
// @Router /api/v1/customers/{id}/warranties [get]
func (h *CustomerHandler) GetWarranties(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid customer ID"))
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	warranties, total, err := h.customerService.GetWarranties(c.Context(), id, page, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, warranties, page, limit, total)
}
