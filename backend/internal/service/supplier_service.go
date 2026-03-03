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

type supplierService struct {
	supplierRepo repository.SupplierRepository
	poRepo       repository.PurchaseOrderRepository
	variantRepo  repository.ProductVariantRepository
	productRepo  repository.ProductRepository
}

func NewSupplierService(
	supplierRepo repository.SupplierRepository,
	poRepo repository.PurchaseOrderRepository,
	variantRepo repository.ProductVariantRepository,
	productRepo repository.ProductRepository,
) SupplierService {
	return &supplierService{
		supplierRepo: supplierRepo,
		poRepo:       poRepo,
		variantRepo:  variantRepo,
		productRepo:  productRepo,
	}
}

func (s *supplierService) Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateSupplierRequest) (*dto.SupplierResponse, error) {
	now := time.Now()
	supplier := &model.Supplier{
		ID:          uuid.New(),
		StoreID:     storeID,
		Name:        req.Name,
		ContactName: req.ContactName,
		Phone:       req.Phone,
		Email:       req.Email,
		Address:     req.Address,
		TaxCode:     req.TaxCode,
		BankAccount: req.BankAccount,
		BankName:    req.BankName,
		Notes:       req.Notes,
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.supplierRepo.Create(ctx, supplier); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create supplier: %w", err))
	}

	return toSupplierResponse(supplier), nil
}

func (s *supplierService) GetByID(ctx context.Context, id uuid.UUID) (*dto.SupplierResponse, error) {
	supplier, err := s.supplierRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("supplier")
	}
	return toSupplierResponse(supplier), nil
}

func (s *supplierService) List(ctx context.Context, storeID uuid.UUID, page, limit int, search string) ([]dto.SupplierResponse, int64, error) {
	suppliers, total, err := s.supplierRepo.List(ctx, storeID, page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.SupplierResponse
	for i := range suppliers {
		responses = append(responses, *toSupplierResponse(&suppliers[i]))
	}
	return responses, total, nil
}

func (s *supplierService) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateSupplierRequest) (*dto.SupplierResponse, error) {
	supplier, err := s.supplierRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("supplier")
	}

	if req.Name != "" {
		supplier.Name = req.Name
	}
	if req.ContactName != "" {
		supplier.ContactName = req.ContactName
	}
	if req.Phone != "" {
		supplier.Phone = req.Phone
	}
	if req.Email != "" {
		supplier.Email = req.Email
	}
	if req.Address != "" {
		supplier.Address = req.Address
	}
	if req.TaxCode != "" {
		supplier.TaxCode = req.TaxCode
	}
	if req.BankAccount != "" {
		supplier.BankAccount = req.BankAccount
	}
	if req.BankName != "" {
		supplier.BankName = req.BankName
	}
	if req.Notes != "" {
		supplier.Notes = req.Notes
	}
	if req.IsActive != nil {
		supplier.IsActive = *req.IsActive
	}

	if err := s.supplierRepo.Update(ctx, supplier); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update supplier: %w", err))
	}

	return toSupplierResponse(supplier), nil
}

func (s *supplierService) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.supplierRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("supplier")
	}
	return s.supplierRepo.Delete(ctx, id)
}

func toSupplierResponse(s *model.Supplier) *dto.SupplierResponse {
	return &dto.SupplierResponse{
		ID:          s.ID,
		StoreID:     s.StoreID,
		Name:        s.Name,
		ContactName: s.ContactName,
		Phone:       s.Phone,
		Email:       s.Email,
		Address:     s.Address,
		TaxCode:     s.TaxCode,
		BankAccount: s.BankAccount,
		BankName:    s.BankName,
		Notes:       s.Notes,
		IsActive:    s.IsActive,
		CreatedAt:   s.CreatedAt,
	}
}

func (s *supplierService) GetPurchaseOrders(ctx context.Context, storeID, supplierID uuid.UUID, page, limit int) ([]dto.PurchaseOrderResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	pos, total, err := s.poRepo.ListBySupplier(ctx, storeID, supplierID, page, limit)
	if err != nil {
		return nil, 0, appErrors.Internal(err)
	}

	results := make([]dto.PurchaseOrderResponse, len(pos))
	for i, po := range pos {
		fullPO, err := s.poRepo.GetByID(ctx, po.ID)
		if err != nil {
			fullPO = &po
		}
		results[i] = *s.toPurchaseOrderResponse(ctx, fullPO)
	}
	return results, total, nil
}

func (s *supplierService) GetDebtSummary(ctx context.Context, storeID, supplierID uuid.UUID) (*dto.SupplierDebtSummary, error) {
	// Get all purchase orders for this supplier (large limit to get all)
	pos, _, err := s.poRepo.ListBySupplier(ctx, storeID, supplierID, 1, 10000)
	if err != nil {
		return nil, appErrors.Internal(err)
	}

	summary := &dto.SupplierDebtSummary{}
	for _, po := range pos {
		summary.TotalOrders++
		summary.TotalAmount += po.TotalAmount
		switch po.Status {
		case "draft":
			summary.DraftOrders++
			summary.PendingAmount += po.TotalAmount
		case "confirmed":
			summary.ConfirmedOrders++
			summary.PendingAmount += po.TotalAmount
		case "received":
			summary.ReceivedOrders++
			summary.ReceivedAmount += po.TotalAmount
		case "cancelled":
			summary.CancelledOrders++
		}
	}

	return summary, nil
}

func (s *supplierService) toPurchaseOrderResponse(ctx context.Context, po *model.PurchaseOrder) *dto.PurchaseOrderResponse {
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

		if variant, err := s.variantRepo.GetByID(ctx, item.ProductVariantID); err == nil {
			itemResp.VariantName = variant.Name
			itemResp.SKU = variant.SKU
			if product, err := s.productRepo.GetByID(ctx, item.ProductVariantID); err == nil {
				itemResp.ProductName = product.Name
			} else {
				itemResp.ProductName = variant.Name
			}
		}

		resp.Items = append(resp.Items, itemResp)
	}

	return resp
}
