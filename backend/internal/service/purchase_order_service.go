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

type purchaseOrderService struct {
	poRepo       repository.PurchaseOrderRepository
	supplierRepo repository.SupplierRepository
	invRepo      repository.InventoryRepository
	variantRepo  repository.ProductVariantRepository
	productRepo  repository.ProductRepository
}

func NewPurchaseOrderService(
	poRepo repository.PurchaseOrderRepository,
	supplierRepo repository.SupplierRepository,
	invRepo repository.InventoryRepository,
	variantRepo repository.ProductVariantRepository,
	productRepo repository.ProductRepository,
) PurchaseOrderService {
	return &purchaseOrderService{
		poRepo:       poRepo,
		supplierRepo: supplierRepo,
		invRepo:      invRepo,
		variantRepo:  variantRepo,
		productRepo:  productRepo,
	}
}

func (s *purchaseOrderService) Create(ctx context.Context, storeID, userID uuid.UUID, req *dto.CreatePurchaseOrderRequest) (*dto.PurchaseOrderResponse, error) {
	// Validate supplier
	_, err := s.supplierRepo.GetByID(ctx, req.SupplierID)
	if err != nil {
		return nil, appErrors.NotFound("Supplier")
	}

	now := time.Now()
	po := &model.PurchaseOrder{
		ID:           uuid.New(),
		StoreID:      storeID,
		SupplierID:   req.SupplierID,
		UserID:       userID,
		OrderNumber:  fmt.Sprintf("PO-%s-%04d", now.Format("20060102"), now.UnixMilli()%10000),
		Status:       "draft",
		Notes:        req.Notes,
		ExpectedDate: req.ExpectedDate,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	var totalAmount float64
	for _, item := range req.Items {
		unitPrice := item.UnitPrice
		if unitPrice == 0 && item.UnitCost > 0 {
			unitPrice = item.UnitCost
		}
		poItem := model.PurchaseOrderItem{
			ID:               uuid.New(),
			PurchaseOrderID:  po.ID,
			ProductVariantID: item.ProductVariantID,
			Quantity:         item.Quantity,
			UnitPrice:        unitPrice,
			TotalPrice:       float64(item.Quantity) * unitPrice,
			CreatedAt:        now,
		}
		totalAmount += poItem.TotalPrice
		po.Items = append(po.Items, poItem)
	}
	po.TotalAmount = totalAmount

	if err := s.poRepo.Create(ctx, po); err != nil {
		return nil, appErrors.Internal(err)
	}

	return s.GetByID(ctx, po.ID)
}

func (s *purchaseOrderService) GetByID(ctx context.Context, id uuid.UUID) (*dto.PurchaseOrderResponse, error) {
	po, err := s.poRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("Purchase order")
	}
	return s.toPurchaseOrderResponse(ctx, po), nil
}

func (s *purchaseOrderService) List(ctx context.Context, storeID uuid.UUID, page, limit int, status string) ([]dto.PurchaseOrderResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	pos, total, err := s.poRepo.List(ctx, storeID, page, limit, status)
	if err != nil {
		return nil, 0, appErrors.Internal(err)
	}

	results := make([]dto.PurchaseOrderResponse, len(pos))
	for i, po := range pos {
		// Load full PO data (items) via GetByID
		fullPO, err := s.poRepo.GetByID(ctx, po.ID)
		if err != nil {
			fullPO = &po
		}
		results[i] = *s.toPurchaseOrderResponse(ctx, fullPO)
	}
	return results, total, nil
}

func (s *purchaseOrderService) Update(ctx context.Context, id uuid.UUID, req *dto.UpdatePurchaseOrderRequest) (*dto.PurchaseOrderResponse, error) {
	po, err := s.poRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("Purchase order")
	}

	if po.Status != "draft" {
		return nil, appErrors.BadRequest("Only draft purchase orders can be updated")
	}

	po.Notes = req.Notes
	if req.ExpectedDate != nil {
		po.ExpectedDate = req.ExpectedDate
	}
	po.UpdatedAt = time.Now()

	if err := s.poRepo.Update(ctx, po); err != nil {
		return nil, appErrors.Internal(err)
	}

	return s.GetByID(ctx, id)
}

func (s *purchaseOrderService) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	po, err := s.poRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("Purchase order")
	}

	// Validate status transitions
	validTransitions := map[string][]string{
		"draft":     {"confirmed", "cancelled"},
		"confirmed": {"received", "cancelled"},
	}

	allowed, ok := validTransitions[po.Status]
	if !ok {
		return appErrors.BadRequest("Cannot change status from " + po.Status)
	}

	valid := false
	for _, s := range allowed {
		if s == status {
			valid = true
			break
		}
	}
	if !valid {
		return appErrors.BadRequest(fmt.Sprintf("Cannot transition from %s to %s", po.Status, status))
	}

	return s.poRepo.UpdateStatus(ctx, id, status)
}

func (s *purchaseOrderService) Receive(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.ReceivePurchaseOrderRequest) (*dto.PurchaseOrderResponse, error) {
	po, err := s.poRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("Purchase order")
	}

	if po.Status != "confirmed" {
		return nil, appErrors.BadRequest("Only confirmed purchase orders can be received")
	}

	now := time.Now()

	// Process each received item
	for _, receiveItem := range req.Items {
		// Find matching PO item
		var poItem *model.PurchaseOrderItem
		for i := range po.Items {
			if po.Items[i].ID == receiveItem.PurchaseOrderItemID {
				poItem = &po.Items[i]
				break
			}
		}
		if poItem == nil {
			return nil, appErrors.BadRequest("Purchase order item not found: " + receiveItem.PurchaseOrderItemID.String())
		}

		if receiveItem.ReceivedQty <= 0 {
			continue
		}

		// Update inventory
		inv, err := s.invRepo.GetByVariantID(ctx, po.StoreID, poItem.ProductVariantID)
		if err != nil {
			// Create inventory record if it doesn't exist
			inv = &model.Inventory{
				ID:               uuid.New(),
				StoreID:          po.StoreID,
				ProductVariantID: poItem.ProductVariantID,
				Quantity:         0,
				UpdatedAt:        now,
			}
			if err := s.invRepo.Create(ctx, inv); err != nil {
				return nil, appErrors.Internal(err)
			}
		}

		prevQty := inv.Quantity
		newQty := prevQty + receiveItem.ReceivedQty

		if err := s.invRepo.UpdateQuantity(ctx, inv.ID, newQty); err != nil {
			return nil, appErrors.Internal(err)
		}

		// Create inventory movement
		movement := &model.InventoryMovement{
			ID:               uuid.New(),
			StoreID:          po.StoreID,
			ProductVariantID: poItem.ProductVariantID,
			Type:             "in",
			Quantity:         receiveItem.ReceivedQty,
			PreviousQty:      prevQty,
			NewQty:           newQty,
			ReferenceType:    "purchase_order",
			ReferenceID:      &po.ID,
			Notes:            fmt.Sprintf("Received from PO %s", po.OrderNumber),
			CreatedBy:        userID,
			CreatedAt:        now,
		}
		if err := s.invRepo.CreateMovement(ctx, movement); err != nil {
			return nil, appErrors.Internal(err)
		}
	}

	// Update PO status
	po.ReceivedDate = &now
	po.Status = "received"
	po.UpdatedAt = now
	if err := s.poRepo.Update(ctx, po); err != nil {
		return nil, appErrors.Internal(err)
	}

	return s.GetByID(ctx, id)
}

func (s *purchaseOrderService) toPurchaseOrderResponse(ctx context.Context, po *model.PurchaseOrder) *dto.PurchaseOrderResponse {
	resp := &dto.PurchaseOrderResponse{
		ID:           po.ID,
		StoreID:      po.StoreID,
		SupplierID:   po.SupplierID,
		UserID:       po.UserID,
		OrderNumber:  po.OrderNumber,
		PONumber:     po.OrderNumber,
		Status:       po.Status,
		TotalAmount:  po.TotalAmount,
		Notes:        po.Notes,
		ExpectedDate: po.ExpectedDate,
		ReceivedDate: po.ReceivedDate,
		CreatedAt:    po.CreatedAt,
		UpdatedAt:    po.UpdatedAt,
	}

	// Load supplier
	if supplier, err := s.supplierRepo.GetByID(ctx, po.SupplierID); err == nil {
		resp.Supplier = toSupplierResponse(supplier)
	}

	// Load items with product/variant info
	for _, item := range po.Items {
		itemResp := dto.PurchaseOrderItemResponse{
			ID:               item.ID,
			ProductVariantID: item.ProductVariantID,
			Quantity:         item.Quantity,
			ReceivedQty:      item.ReceivedQty,
			UnitPrice:        item.UnitPrice,
			UnitCost:         item.UnitPrice,
			TotalPrice:       item.TotalPrice,
			TotalCost:        item.TotalPrice,
		}

		// Resolve product name, variant name, SKU
		if variant, err := s.variantRepo.GetByID(ctx, item.ProductVariantID); err == nil {
			itemResp.VariantName = variant.Name
			itemResp.SKU = variant.SKU
			// Resolve actual product name
			if product, err := s.productRepo.GetByID(ctx, variant.ProductID); err == nil {
				itemResp.ProductName = product.Name
			} else {
				itemResp.ProductName = variant.Name
			}
		}

		resp.Items = append(resp.Items, itemResp)
	}

	return resp
}
