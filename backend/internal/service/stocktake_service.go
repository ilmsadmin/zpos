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

	itemsWithProduct, err := s.stocktakeRepo.GetItemsWithProductInfo(ctx, id)
	if err != nil {
		return nil, appErrors.Internal(err)
	}

	return s.toStocktakeResponseWithProducts(st, itemsWithProduct), nil
}

func (s *stocktakeService) List(ctx context.Context, storeID uuid.UUID, params *dto.StocktakeListParams) ([]dto.StocktakeResponse, int64, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 100 {
		params.Limit = 20
	}

	stocktakes, total, err := s.stocktakeRepo.List(ctx, storeID, params.Page, params.Limit, params.Status, params.Search)
	if err != nil {
		return nil, 0, appErrors.Internal(err)
	}

	results := make([]dto.StocktakeResponse, len(stocktakes))
	for i, st := range stocktakes {
		// For list, load items with product info
		itemsWithProduct, err := s.stocktakeRepo.GetItemsWithProductInfo(ctx, st.ID)
		if err != nil {
			// Fallback: return without items
			results[i] = *s.toStocktakeResponseWithProducts(&st, nil)
			continue
		}
		results[i] = *s.toStocktakeResponseWithProducts(&st, itemsWithProduct)
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

	// Check if variant already exists in this stocktake
	existingItem, err := s.stocktakeRepo.GetItemByVariant(ctx, stocktakeID, req.ProductVariantID)
	if err == nil && existingItem != nil {
		// Update existing item instead of creating duplicate
		existingItem.CountedQty = req.CountedQty
		existingItem.Difference = req.CountedQty - existingItem.SystemQty
		if req.Notes != "" {
			existingItem.Notes = req.Notes
		}
		existingItem.CountedAt = time.Now()
		if err := s.stocktakeRepo.UpdateItem(ctx, existingItem); err != nil {
			return nil, appErrors.Internal(err)
		}
		return s.getItemResponseWithProduct(ctx, stocktakeID, existingItem.ID)
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

	return s.getItemResponseWithProduct(ctx, stocktakeID, item.ID)
}

func (s *stocktakeService) AddItemByBarcode(ctx context.Context, stocktakeID uuid.UUID, barcode string, countedQty int) (*dto.StocktakeItemResponse, error) {
	variant, err := s.variantRepo.GetByBarcode(ctx, barcode)
	if err != nil {
		return nil, appErrors.NotFound("Sản phẩm không tìm thấy với barcode: " + barcode)
	}

	req := &dto.AddStocktakeItemRequest{
		ProductVariantID: variant.ID,
		CountedQty:       countedQty,
	}
	return s.AddItem(ctx, stocktakeID, req)
}

func (s *stocktakeService) UpdateItem(ctx context.Context, stocktakeID, itemID uuid.UUID, req *dto.UpdateStocktakeItemRequest) (*dto.StocktakeItemResponse, error) {
	st, err := s.stocktakeRepo.GetByID(ctx, stocktakeID)
	if err != nil {
		return nil, appErrors.NotFound("Stocktake")
	}

	if st.Status != "draft" && st.Status != "in_progress" {
		return nil, appErrors.BadRequest("Cannot update items of a completed/cancelled stocktake")
	}

	// Get existing items to find the one to update
	items, err := s.stocktakeRepo.GetItems(ctx, stocktakeID)
	if err != nil {
		return nil, appErrors.Internal(err)
	}

	var targetIdx = -1
	for i := range items {
		if items[i].ID == itemID {
			targetIdx = i
			break
		}
	}
	if targetIdx == -1 {
		return nil, appErrors.NotFound("Stocktake item")
	}

	items[targetIdx].CountedQty = req.CountedQty
	items[targetIdx].Difference = req.CountedQty - items[targetIdx].SystemQty
	items[targetIdx].Notes = req.Notes
	items[targetIdx].CountedAt = time.Now()

	if err := s.stocktakeRepo.UpdateItem(ctx, &items[targetIdx]); err != nil {
		return nil, appErrors.Internal(err)
	}

	return s.getItemResponseWithProduct(ctx, stocktakeID, itemID)
}

func (s *stocktakeService) DeleteItem(ctx context.Context, stocktakeID, itemID uuid.UUID) error {
	st, err := s.stocktakeRepo.GetByID(ctx, stocktakeID)
	if err != nil {
		return appErrors.NotFound("Stocktake")
	}

	if st.Status != "draft" && st.Status != "in_progress" {
		return appErrors.BadRequest("Cannot delete items of a completed/cancelled stocktake")
	}

	if err := s.stocktakeRepo.DeleteItem(ctx, itemID); err != nil {
		return appErrors.Internal(err)
	}

	return nil
}

func (s *stocktakeService) Cancel(ctx context.Context, id uuid.UUID) (*dto.StocktakeResponse, error) {
	st, err := s.stocktakeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("Stocktake")
	}

	if st.Status == "completed" {
		return nil, appErrors.BadRequest("Cannot cancel a completed stocktake")
	}

	if st.Status == "cancelled" {
		return nil, appErrors.BadRequest("Stocktake is already cancelled")
	}

	now := time.Now()
	st.Status = "cancelled"
	st.UpdatedAt = now

	if err := s.stocktakeRepo.Update(ctx, st); err != nil {
		return nil, appErrors.Internal(err)
	}

	return s.GetByID(ctx, id)
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

	if len(items) == 0 {
		return nil, appErrors.BadRequest("Cannot complete a stocktake with no items")
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

func (s *stocktakeService) getItemResponseWithProduct(ctx context.Context, stocktakeID, itemID uuid.UUID) (*dto.StocktakeItemResponse, error) {
	itemsWithProduct, err := s.stocktakeRepo.GetItemsWithProductInfo(ctx, stocktakeID)
	if err != nil {
		return nil, appErrors.Internal(err)
	}
	for _, item := range itemsWithProduct {
		if item.ID == itemID {
			return &dto.StocktakeItemResponse{
				ID:               item.ID,
				ProductVariantID: item.ProductVariantID,
				ProductName:      item.ProductName,
				VariantName:      item.VariantName,
				SKU:              item.SKU,
				Barcode:          item.Barcode,
				SystemQty:        item.SystemQty,
				CountedQty:       item.CountedQty,
				Difference:       item.Difference,
				Notes:            item.Notes,
				CountedAt:        item.CountedAt,
			}, nil
		}
	}
	return nil, appErrors.NotFound("Stocktake item")
}

func (s *stocktakeService) toStocktakeResponseWithProducts(st *model.Stocktake, itemsWithProduct []repository.StocktakeItemWithProduct) *dto.StocktakeResponse {
	resp := &dto.StocktakeResponse{
		ID:              st.ID,
		StoreID:         st.StoreID,
		UserID:          st.UserID,
		Code:            st.Code,
		StocktakeNumber: st.Code,
		Status:          st.Status,
		Notes:           st.Notes,
		TotalItems:      st.TotalItems,
		MatchedItems:    st.MatchedItems,
		MismatchItems:   st.MismatchItems,
		StartedAt:       st.StartedAt,
		CompletedAt:     st.CompletedAt,
		CreatedAt:       st.CreatedAt,
		UpdatedAt:       st.UpdatedAt,
	}

	for _, item := range itemsWithProduct {
		resp.Items = append(resp.Items, dto.StocktakeItemResponse{
			ID:               item.ID,
			ProductVariantID: item.ProductVariantID,
			ProductName:      item.ProductName,
			VariantName:      item.VariantName,
			SKU:              item.SKU,
			Barcode:          item.Barcode,
			SystemQty:        item.SystemQty,
			CountedQty:       item.CountedQty,
			Difference:       item.Difference,
			Notes:            item.Notes,
			CountedAt:        item.CountedAt,
		})
	}

	return resp
}
