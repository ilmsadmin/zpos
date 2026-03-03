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

type inventoryService struct {
	invRepo     repository.InventoryRepository
	variantRepo repository.ProductVariantRepository
}

func NewInventoryService(invRepo repository.InventoryRepository, variantRepo repository.ProductVariantRepository) InventoryService {
	return &inventoryService{invRepo: invRepo, variantRepo: variantRepo}
}

func (s *inventoryService) GetByVariant(ctx context.Context, storeID, variantID uuid.UUID) (*dto.InventoryResponse, error) {
	inv, err := s.invRepo.GetByVariantID(ctx, storeID, variantID)
	if err != nil {
		return nil, appErrors.NotFound("inventory")
	}
	return toInventoryResponse(inv), nil
}

func (s *inventoryService) AdjustStock(ctx context.Context, storeID, userID uuid.UUID, req *dto.AdjustInventoryRequest) error {
	inv, err := s.invRepo.GetByVariantID(ctx, storeID, req.ProductVariantID)
	if err != nil {
		inv = &model.Inventory{
			ID:               uuid.New(),
			StoreID:          storeID,
			ProductVariantID: req.ProductVariantID,
			Quantity:         0,
			ReservedQty:      0,
			MinStockLevel:    5,
			UpdatedAt:        time.Now(),
		}
		if err := s.invRepo.Create(ctx, inv); err != nil {
			return appErrors.Internal(fmt.Errorf("failed to create inventory: %w", err))
		}
	}

	previousQty := inv.Quantity
	newQty := previousQty

	switch req.Type {
	case "in":
		newQty = previousQty + req.Quantity
	case "out":
		if previousQty < req.Quantity {
			return appErrors.BadRequest("Số lượng tồn kho không đủ")
		}
		newQty = previousQty - req.Quantity
	case "adjustment":
		newQty = req.Quantity
	default:
		return appErrors.BadRequest("Loại điều chỉnh không hợp lệ")
	}

	if err := s.invRepo.UpdateQuantity(ctx, inv.ID, newQty); err != nil {
		return appErrors.Internal(fmt.Errorf("failed to update quantity: %w", err))
	}

	movement := &model.InventoryMovement{
		ID:               uuid.New(),
		StoreID:          storeID,
		ProductVariantID: req.ProductVariantID,
		Type:             req.Type,
		Quantity:         req.Quantity,
		PreviousQty:      previousQty,
		NewQty:           newQty,
		ReferenceType:    "manual",
		Notes:            req.Notes,
		CreatedBy:        userID,
		CreatedAt:        time.Now(),
	}
	if err := s.invRepo.CreateMovement(ctx, movement); err != nil {
		return appErrors.Internal(fmt.Errorf("failed to create movement: %w", err))
	}

	return nil
}

func (s *inventoryService) BulkAdjust(ctx context.Context, storeID, userID uuid.UUID, req *dto.BulkAdjustInventoryRequest) error {
	for _, item := range req.Items {
		if err := s.AdjustStock(ctx, storeID, userID, &item); err != nil {
			return err
		}
	}
	return nil
}

func (s *inventoryService) GetLowStock(ctx context.Context, storeID uuid.UUID, page, limit int) ([]dto.InventoryResponse, int64, error) {
	items, total, err := s.invRepo.GetLowStock(ctx, storeID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.InventoryResponse
	for i := range items {
		responses = append(responses, *toInventoryResponse(&items[i]))
	}
	return responses, total, nil
}

func (s *inventoryService) GetMovements(ctx context.Context, storeID, variantID uuid.UUID, page, limit int) ([]interface{}, int64, error) {
	movements, total, err := s.invRepo.GetMovements(ctx, storeID, variantID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	var result []interface{}
	for _, m := range movements {
		result = append(result, map[string]interface{}{
			"id":                 m.ID,
			"store_id":           m.StoreID,
			"product_variant_id": m.ProductVariantID,
			"type":               m.Type,
			"quantity":           m.Quantity,
			"previous_qty":       m.PreviousQty,
			"new_qty":            m.NewQty,
			"reference_type":     m.ReferenceType,
			"reference_id":       m.ReferenceID,
			"notes":              m.Notes,
			"created_by":         m.CreatedBy,
			"created_at":         m.CreatedAt,
		})
	}
	return result, total, nil
}

func toInventoryResponse(inv *model.Inventory) *dto.InventoryResponse {
	return &dto.InventoryResponse{
		ID:               inv.ID,
		StoreID:          inv.StoreID,
		ProductVariantID: inv.ProductVariantID,
		ProductName:      inv.ProductName,
		VariantName:      inv.VariantName,
		SKU:              inv.SKU,
		Quantity:         inv.Quantity,
		ReservedQty:      inv.ReservedQty,
		AvailableQty:     inv.AvailableQty(),
		MinStockLevel:    inv.MinStockLevel,
		MaxStockLevel:    inv.MaxStockLevel,
		Location:         inv.Location,
		IsLowStock:       inv.IsLowStock(),
	}
}
