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

type ProductHandler struct {
	productService service.ProductService
	validate       *validator.CustomValidator
}

func NewProductHandler(productService service.ProductService, validate *validator.CustomValidator) *ProductHandler {
	return &ProductHandler{
		productService: productService,
		validate:       validate,
	}
}

func (h *ProductHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	storeID := middleware.GetStoreID(c)
	result, err := h.productService.Create(c.Context(), storeID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid product ID"))
	}

	result, err := h.productService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

func (h *ProductHandler) List(c *fiber.Ctx) error {
	var params dto.ProductListParams
	if err := c.QueryParser(&params); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid query parameters"))
	}

	storeID := middleware.GetStoreID(c)
	products, total, err := h.productService.List(c.Context(), storeID, &params)
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
	return response.Paginated(c, products, page, limit, total)
}

func (h *ProductHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid product ID"))
	}

	var req dto.UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.productService.Update(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

func (h *ProductHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid product ID"))
	}

	if err := h.productService.Delete(c.Context(), id); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.NoContent(c)
}

func (h *ProductHandler) Search(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return response.Error(c, appErrors.BadRequest("Search query is required"))
	}

	storeID := middleware.GetStoreID(c)
	limit := c.QueryInt("limit", 10)
	results, err := h.productService.Search(c.Context(), storeID, query, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, results)
}

func (h *ProductHandler) GetByBarcode(c *fiber.Ctx) error {
	barcode := c.Params("barcode")
	if barcode == "" {
		return response.Error(c, appErrors.BadRequest("Barcode is required"))
	}

	result, err := h.productService.GetByBarcode(c.Context(), barcode)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Variant endpoints

func (h *ProductHandler) CreateVariant(c *fiber.Ctx) error {
	productID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid product ID"))
	}

	var req dto.CreateVariantRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.productService.CreateVariant(c.Context(), productID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

func (h *ProductHandler) UpdateVariant(c *fiber.Ctx) error {
	variantID, err := uuid.Parse(c.Params("variantId"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid variant ID"))
	}

	var req dto.UpdateVariantRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.productService.UpdateVariant(c.Context(), variantID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

func (h *ProductHandler) DeleteVariant(c *fiber.Ctx) error {
	variantID, err := uuid.Parse(c.Params("variantId"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid variant ID"))
	}

	if err := h.productService.DeleteVariant(c.Context(), variantID); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.NoContent(c)
}
