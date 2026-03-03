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

type customerService struct {
	customerRepo repository.CustomerRepository
	orderRepo    repository.OrderRepository
	warrantyRepo repository.WarrantyRepository
}

func NewCustomerService(customerRepo repository.CustomerRepository, orderRepo repository.OrderRepository, warrantyRepo repository.WarrantyRepository) CustomerService {
	return &customerService{
		customerRepo: customerRepo,
		orderRepo:    orderRepo,
		warrantyRepo: warrantyRepo,
	}
}

func (s *customerService) Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateCustomerRequest) (*dto.CustomerResponse, error) {
	existing, _ := s.customerRepo.GetByPhone(ctx, storeID, req.Phone)
	if existing != nil {
		return nil, appErrors.Conflict("Số điện thoại đã được sử dụng")
	}

	now := time.Now()
	customer := &model.Customer{
		ID:          uuid.New(),
		StoreID:     storeID,
		FullName:    req.FullName,
		Phone:       req.Phone,
		Email:       req.Email,
		Address:     req.Address,
		DateOfBirth: req.DateOfBirth,
		Gender:      req.Gender,
		Notes:       req.Notes,
		Tags:        model.StringArr(req.Tags),
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.customerRepo.Create(ctx, customer); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create customer: %w", err))
	}

	return toCustomerResponse(customer), nil
}

func (s *customerService) GetByID(ctx context.Context, id uuid.UUID) (*dto.CustomerResponse, error) {
	customer, err := s.customerRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("customer")
	}
	return toCustomerResponse(customer), nil
}

func (s *customerService) List(ctx context.Context, storeID uuid.UUID, params *dto.CustomerListParams) ([]dto.CustomerResponse, int64, error) {
	customers, total, err := s.customerRepo.List(ctx, storeID, params.Page, params.Limit, params.Search)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.CustomerResponse
	for i := range customers {
		responses = append(responses, *toCustomerResponse(&customers[i]))
	}
	return responses, total, nil
}

func (s *customerService) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateCustomerRequest) (*dto.CustomerResponse, error) {
	customer, err := s.customerRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("customer")
	}

	if req.FullName != "" {
		customer.FullName = req.FullName
	}
	if req.Phone != "" {
		customer.Phone = req.Phone
	}
	if req.Email != "" {
		customer.Email = req.Email
	}
	if req.Address != "" {
		customer.Address = req.Address
	}
	if req.DateOfBirth != nil {
		customer.DateOfBirth = req.DateOfBirth
	}
	if req.Gender != "" {
		customer.Gender = req.Gender
	}
	if req.Notes != "" {
		customer.Notes = req.Notes
	}
	if req.Tags != nil {
		customer.Tags = model.StringArr(req.Tags)
	}
	if req.IsActive != nil {
		customer.IsActive = *req.IsActive
	}

	if err := s.customerRepo.Update(ctx, customer); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update customer: %w", err))
	}

	return toCustomerResponse(customer), nil
}

func (s *customerService) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.customerRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("customer")
	}
	return s.customerRepo.Delete(ctx, id)
}

func (s *customerService) Search(ctx context.Context, storeID uuid.UUID, query string) ([]dto.CustomerResponse, error) {
	customers, _, err := s.customerRepo.List(ctx, storeID, 1, 20, query)
	if err != nil {
		return nil, err
	}

	var responses []dto.CustomerResponse
	for i := range customers {
		responses = append(responses, *toCustomerResponse(&customers[i]))
	}
	return responses, nil
}

func toCustomerResponse(c *model.Customer) *dto.CustomerResponse {
	return &dto.CustomerResponse{
		ID:          c.ID,
		StoreID:     c.StoreID,
		FullName:    c.FullName,
		Phone:       c.Phone,
		Email:       c.Email,
		Address:     c.Address,
		DateOfBirth: c.DateOfBirth,
		Gender:      c.Gender,
		TotalSpent:  c.TotalSpent,
		OrderCount:  c.OrderCount,
		Points:      c.Points,
		Tags:        []string(c.Tags),
		IsActive:    c.IsActive,
		CreatedAt:   c.CreatedAt,
	}
}

func (s *customerService) GetOrders(ctx context.Context, customerID uuid.UUID, page, limit int) ([]dto.OrderResponse, int64, error) {
	customer, err := s.customerRepo.GetByID(ctx, customerID)
	if err != nil {
		return nil, 0, appErrors.NotFound("customer")
	}

	repoParams := repository.OrderListParams{
		Page:       page,
		Limit:      limit,
		CustomerID: customerID,
	}

	orders, total, err := s.orderRepo.List(ctx, customer.StoreID, repoParams)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.OrderResponse
	for i := range orders {
		responses = append(responses, *toOrderResponseFromModel(&orders[i]))
	}
	return responses, total, nil
}

func (s *customerService) GetWarranties(ctx context.Context, customerID uuid.UUID, page, limit int) ([]dto.WarrantyResponse, int64, error) {
	customer, err := s.customerRepo.GetByID(ctx, customerID)
	if err != nil {
		return nil, 0, appErrors.NotFound("customer")
	}

	repoParams := repository.WarrantyListParams{
		Page:       page,
		Limit:      limit,
		CustomerID: customerID,
	}

	warranties, total, err := s.warrantyRepo.List(ctx, customer.StoreID, repoParams)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.WarrantyResponse
	for i := range warranties {
		resp := dto.WarrantyResponse{
			ID:             warranties[i].ID,
			StoreID:        warranties[i].StoreID,
			WarrantyCode:   warranties[i].WarrantyCode,
			SerialNumber:   warranties[i].SerialNumber,
			StartDate:      warranties[i].StartDate,
			EndDate:        warranties[i].EndDate,
			WarrantyMonths: warranties[i].WarrantyMonths,
			Status:         warranties[i].Status,
			DaysRemaining:  warranties[i].DaysRemaining(),
			Terms:          warranties[i].Terms,
			CreatedAt:      warranties[i].CreatedAt,
		}
		responses = append(responses, resp)
	}
	return responses, total, nil
}

// toOrderResponseFromModel converts a model.Order to dto.OrderResponse
func toOrderResponseFromModel(o *model.Order) *dto.OrderResponse {
	resp := &dto.OrderResponse{
		ID:             o.ID,
		StoreID:        o.StoreID,
		CustomerID:     o.CustomerID,
		UserID:         o.UserID,
		OrderNumber:    o.OrderNumber,
		Status:         o.Status,
		SubTotal:       o.SubTotal,
		DiscountType:   o.DiscountType,
		DiscountValue:  o.DiscountValue,
		DiscountAmount: o.DiscountAmount,
		TaxAmount:      o.TaxAmount,
		TotalAmount:    o.TotalAmount,
		PaidAmount:     o.PaidAmount,
		ChangeAmount:   o.ChangeAmount,
		Notes:          o.Notes,
		CreatedAt:      o.CreatedAt,
		UpdatedAt:      o.UpdatedAt,
	}

	for _, item := range o.Items {
		resp.Items = append(resp.Items, dto.OrderItemResponse{
			ID:               item.ID,
			ProductVariantID: item.ProductVariantID,
			ProductName:      item.ProductName,
			VariantName:      item.VariantName,
			SKU:              item.SKU,
			Quantity:         item.Quantity,
			UnitPrice:        item.UnitPrice,
			DiscountType:     item.DiscountType,
			DiscountValue:    item.DiscountValue,
			DiscountAmount:   item.DiscountAmount,
			TotalPrice:       item.TotalPrice,
			WarrantyMonths:   item.WarrantyMonths,
		})
	}

	for _, p := range o.Payments {
		resp.Payments = append(resp.Payments, dto.PaymentResponse{
			ID:            p.ID,
			Method:        p.Method,
			Amount:        p.Amount,
			Status:        p.Status,
			TransactionID: p.TransactionID,
			PaidAt:        p.PaidAt,
		})
	}

	return resp
}
