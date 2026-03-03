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

type CategoryHandler struct {
	categoryService service.CategoryService
	validate        *validator.CustomValidator
}

func NewCategoryHandler(categoryService service.CategoryService, validate *validator.CustomValidator) *CategoryHandler {
	return &CategoryHandler{
		categoryService: categoryService,
		validate:        validate,
	}
}

// GetTree godoc
// @Summary Get category tree
// @Tags Categories
// @Produce json
// @Success 200 {array} dto.CategoryResponse
// @Security BearerAuth
// @Router /api/v1/categories [get]
func (h *CategoryHandler) GetTree(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	categories, err := h.categoryService.GetTree(c.Context(), storeID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, categories)
}

// GetByID godoc
// @Summary Get category by ID
// @Tags Categories
// @Produce json
// @Param id path string true "Category ID"
// @Success 200 {object} dto.CategoryResponse
// @Security BearerAuth
// @Router /api/v1/categories/{id} [get]
func (h *CategoryHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid category ID"))
	}

	result, err := h.categoryService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Create godoc
// @Summary Create a new category
// @Tags Categories
// @Accept json
// @Produce json
// @Param body body dto.CreateCategoryRequest true "Category data"
// @Success 201 {object} dto.CategoryResponse
// @Security BearerAuth
// @Router /api/v1/categories [post]
func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	storeID := middleware.GetStoreID(c)
	result, err := h.categoryService.Create(c.Context(), storeID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

// Update godoc
// @Summary Update a category
// @Tags Categories
// @Accept json
// @Produce json
// @Param id path string true "Category ID"
// @Param body body dto.UpdateCategoryRequest true "Category data"
// @Success 200 {object} dto.CategoryResponse
// @Security BearerAuth
// @Router /api/v1/categories/{id} [put]
func (h *CategoryHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid category ID"))
	}

	var req dto.UpdateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.categoryService.Update(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Delete godoc
// @Summary Delete a category
// @Tags Categories
// @Param id path string true "Category ID"
// @Success 204
// @Security BearerAuth
// @Router /api/v1/categories/{id} [delete]
func (h *CategoryHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid category ID"))
	}

	if err := h.categoryService.Delete(c.Context(), id); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.NoContent(c)
}
