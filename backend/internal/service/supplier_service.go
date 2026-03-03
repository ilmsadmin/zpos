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
}

func NewSupplierService(supplierRepo repository.SupplierRepository) SupplierService {
	return &supplierService{supplierRepo: supplierRepo}
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
		IsActive:    s.IsActive,
		CreatedAt:   s.CreatedAt,
	}
}
