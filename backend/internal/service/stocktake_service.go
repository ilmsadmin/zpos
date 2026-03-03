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

type stocktakeService struct {
	stocktakeRepo repository.StocktakeRepository
	invRepo       repository.InventoryRepository
	variantRepo   repository.ProductVariantRepository
}

func NewStocktakeService(
	stocktakeRepo repository.StocktakeRepository,
	invRepo repository.InventoryRepository,
	variantRepo repository.ProductVariantRepository,
) StocktakeService {
	return &stocktakeService{
		stocktakeRepo: stocktakeRepo,
		invRepo:       invRepo,
		variantRepo:   variantRepo,
	}
}

func (s *stocktakeService) Create(ctx context.Context, storeID, userID uuid.UUID, req *dto.CreateStocktakeRequest) (*dto.StocktakeResponse, error) {
	now := time.Now()
	stocktake := &model.Stocktake{
		ID:        uuid.New(),
		StoreID:   storeID,
		UserID:    userID,
		Code:      fmt.Sprintf("ST-%s-%04d", now.Format("20060102"), now.UnixMilli()%10000),
		Status:    "draft",
		Notes:     req.Notes,
		StartedAt: &now,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.stocktakeRepo.Create(ctx, stocktake); err != nil {
		return nil, appErrors.Internal(err)
	}

	return s.GetByID(ctx, stocktake.ID)
}

func (s *stocktakeService) GetByID(ctx context.Context, id uuid.UUID) (*dto.StocktakeResponse, error) {
	st, err := s.stocktakeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("Stocktake")
	}

	items, err := s.stocktakeRepo.GetItems(ctx, id)
	if err != nil {
		return nil, appErrors.Internal(err)
	}
	st.Items = items

	return s.toStocktakeResponse(st), nil
}

func (s *stocktakeService) List(ctx context.Context, storeID uuid.UUID, page, limit int) ([]dto.StocktakeResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	stocktakes, total, err := s.stocktakeRepo.List(ctx, storeID, page, limit)
	if err != nil {
		return nil, 0, appErrors.Internal(err)
	}

	results := make([]dto.StocktakeResponse, len(stocktakes))
	for i, st := range stocktakes {
		results[i] = *s.toStocktakeResponse(&st)
	}
	return results, total, nil
}

func (s *stocktakeService) AddItem(ctx context.Context, stocktakeID uuid.UUID, req *dto.AddStocktakeItemRequest) (*dto.StocktakeItemResponse, error) {
	st, err := s.stocktakeRepo.GetByID(ctx, stocktakeID)
	if err != nil {
		return nil, appErrors.NotFound("Stocktake")
	}

	if st.Status != "draft" && st.Status != "in_progress" {
		return nil, appErrors.BadRequest("Stocktake is not in progress")
	}

	// Update status to in_progress if draft
	if st.Status == "draft" {
		st.Status = "in_progress"
		st.UpdatedAt = time.Now()
		if err := s.stocktakeRepo.Update(ctx, st); err != nil {
			return nil, appErrors.Internal(err)
		}
	}

	// Get system quantity
	inv, err := s.invRepo.GetByVariantID(ctx, st.StoreID, req.ProductVariantID)
	systemQty := 0
	if err == nil {
		systemQty = inv.Quantity
	}

	now := time.Now()
	item := &model.StocktakeItem{
		ID:               uuid.New(),
		StocktakeID:      stocktakeID,
		ProductVariantID: req.ProductVariantID,
		SystemQty:        systemQty,
		CountedQty:       req.CountedQty,
		Difference:       req.CountedQty - systemQty,
		Notes:            req.Notes,
		CountedAt:        now,
	}

	if err := s.stocktakeRepo.AddItem(ctx, item); err != nil {
		return nil, appErrors.Internal(err)
	}

	return &dto.StocktakeItemResponse{
		ID:               item.ID,
		ProductVariantID: item.ProductVariantID,
		SystemQty:        item.SystemQty,
		CountedQty:       item.CountedQty,
		Difference:       item.Difference,
		Notes:            item.Notes,
		CountedAt:        item.CountedAt,
	}, nil
}

func (s *stocktakeService) Complete(ctx context.Context, id uuid.UUID) (*dto.StocktakeResponse, error) {
	st, err := s.stocktakeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("Stocktake")
	}

	if st.Status != "in_progress" {
		return nil, appErrors.BadRequest("Only in-progress stocktakes can be completed")
	}

	items, err := s.stocktakeRepo.GetItems(ctx, id)
	if err != nil {
		return nil, appErrors.Internal(err)
	}

	now := time.Now()
	matched := 0
	mismatched := 0

	// Adjust inventory for each item
	for _, item := range items {
		if item.Difference == 0 {
			matched++
			continue
		}
		mismatched++

		inv, err := s.invRepo.GetByVariantID(ctx, st.StoreID, item.ProductVariantID)
		if err != nil {
			// Create inventory record if not exists
			inv = &model.Inventory{
				ID:               uuid.New(),
				StoreID:          st.StoreID,
				ProductVariantID: item.ProductVariantID,
				Quantity:         0,
				UpdatedAt:        now,
			}
			if err := s.invRepo.Create(ctx, inv); err != nil {
				return nil, appErrors.Internal(err)
			}
		}

		prevQty := inv.Quantity
		if err := s.invRepo.UpdateQuantity(ctx, inv.ID, item.CountedQty); err != nil {
			return nil, appErrors.Internal(err)
		}

		// Create movement record
		movement := &model.InventoryMovement{
			ID:               uuid.New(),
			StoreID:          st.StoreID,
			ProductVariantID: item.ProductVariantID,
			Type:             "adjustment",
			Quantity:         item.Difference,
			PreviousQty:      prevQty,
			NewQty:           item.CountedQty,
			ReferenceType:    "stocktake",
			ReferenceID:      &id,
			Notes:            fmt.Sprintf("Stocktake %s adjustment", st.Code),
			CreatedBy:        st.UserID,
			CreatedAt:        now,
		}
		if err := s.invRepo.CreateMovement(ctx, movement); err != nil {
			return nil, appErrors.Internal(err)
		}
	}

	st.Status = "completed"
	st.CompletedAt = &now
	st.TotalItems = len(items)
	st.MatchedItems = matched
	st.MismatchItems = mismatched
	st.UpdatedAt = now

	if err := s.stocktakeRepo.Update(ctx, st); err != nil {
		return nil, appErrors.Internal(err)
	}

	return s.GetByID(ctx, id)
}

func (s *stocktakeService) toStocktakeResponse(st *model.Stocktake) *dto.StocktakeResponse {
	resp := &dto.StocktakeResponse{
		ID:            st.ID,
		StoreID:       st.StoreID,
		UserID:        st.UserID,
		Code:          st.Code,
		Status:        st.Status,
		Notes:         st.Notes,
		TotalItems:    st.TotalItems,
		MatchedItems:  st.MatchedItems,
		MismatchItems: st.MismatchItems,
		StartedAt:     st.StartedAt,
		CompletedAt:   st.CompletedAt,
		CreatedAt:     st.CreatedAt,
		UpdatedAt:     st.UpdatedAt,
	}

	for _, item := range st.Items {
		resp.Items = append(resp.Items, dto.StocktakeItemResponse{
			ID:               item.ID,
			ProductVariantID: item.ProductVariantID,
			SystemQty:        item.SystemQty,
			CountedQty:       item.CountedQty,
			Difference:       item.Difference,
			Notes:            item.Notes,
			CountedAt:        item.CountedAt,
		})
	}

	return resp
}
