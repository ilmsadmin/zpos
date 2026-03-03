package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
	appErrors "github.com/zplus/pos/pkg/errors"
)

type categoryService struct {
	categoryRepo repository.CategoryRepository
}

func NewCategoryService(categoryRepo repository.CategoryRepository) CategoryService {
	return &categoryService{categoryRepo: categoryRepo}
}

func (s *categoryService) Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateCategoryRequest) (*dto.CategoryResponse, error) {
	now := time.Now()
	cat := &model.Category{
		ID:          uuid.New(),
		StoreID:     storeID,
		ParentID:    req.ParentID,
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		SortOrder:   req.SortOrder,
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.categoryRepo.Create(ctx, cat); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create category: %w", err))
	}

	return toCategoryResponse(cat), nil
}

func (s *categoryService) GetByID(ctx context.Context, id uuid.UUID) (*dto.CategoryResponse, error) {
	cat, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("category")
	}
	return toCategoryResponse(cat), nil
}

func (s *categoryService) GetTree(ctx context.Context, storeID uuid.UUID) ([]dto.CategoryResponse, error) {
	categories, err := s.categoryRepo.GetTree(ctx, storeID)
	if err != nil {
		return nil, err
	}

	var responses []dto.CategoryResponse
	for i := range categories {
		responses = append(responses, *toCategoryResponse(&categories[i]))
	}
	return responses, nil
}

func (s *categoryService) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateCategoryRequest) (*dto.CategoryResponse, error) {
	cat, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("category")
	}

	if req.Name != "" {
		cat.Name = req.Name
	}
	if req.Description != "" {
		cat.Description = req.Description
	}
	if req.ImageURL != "" {
		cat.ImageURL = req.ImageURL
	}
	if req.ParentID != nil {
		cat.ParentID = req.ParentID
	}
	if req.SortOrder != nil {
		cat.SortOrder = *req.SortOrder
	}
	if req.IsActive != nil {
		cat.IsActive = *req.IsActive
	}

	if err := s.categoryRepo.Update(ctx, cat); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update category: %w", err))
	}

	return toCategoryResponse(cat), nil
}

func (s *categoryService) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("category")
	}
	return s.categoryRepo.Delete(ctx, id)
}

func toCategoryResponse(cat *model.Category) *dto.CategoryResponse {
	resp := &dto.CategoryResponse{
		ID:          cat.ID,
		StoreID:     cat.StoreID,
		ParentID:    cat.ParentID,
		Name:        cat.Name,
		Slug:        cat.Slug,
		Description: cat.Description,
		ImageURL:    cat.ImageURL,
		SortOrder:   cat.SortOrder,
		IsActive:    cat.IsActive,
	}
	if len(cat.Children) > 0 {
		for i := range cat.Children {
			resp.Children = append(resp.Children, *toCategoryResponse(&cat.Children[i]))
		}
	}
	return resp
}
