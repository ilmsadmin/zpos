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

type orderService struct {
	orderRepo      repository.OrderRepository
	invRepo        repository.InventoryRepository
	variantRepo    repository.ProductVariantRepository
	customerRepo   repository.CustomerRepository
	productRepo    repository.ProductRepository
	posSessionRepo repository.POSSessionRepository
}

func NewOrderService(
	orderRepo repository.OrderRepository,
	invRepo repository.InventoryRepository,
	variantRepo repository.ProductVariantRepository,
	customerRepo repository.CustomerRepository,
	productRepo repository.ProductRepository,
	posSessionRepo repository.POSSessionRepository,
) OrderService {
	return &orderService{
		orderRepo:      orderRepo,
		invRepo:        invRepo,
		variantRepo:    variantRepo,
		customerRepo:   customerRepo,
		productRepo:    productRepo,
		posSessionRepo: posSessionRepo,
	}
}

func (s *orderService) Create(ctx context.Context, storeID, userID uuid.UUID, req *dto.CreateOrderRequest) (*dto.OrderResponse, error) {
	now := time.Now()
	orderNumber := fmt.Sprintf("ORD-%s-%d", now.Format("20060102"), now.UnixMilli()%100000)

	order := &model.Order{
		ID:            uuid.New(),
		StoreID:       storeID,
		CustomerID:    req.CustomerID,
		UserID:        userID,
		POSSessionID:  req.POSSessionID,
		OrderNumber:   orderNumber,
		Status:        model.OrderStatusCompleted,
		DiscountType:  req.DiscountType,
		DiscountValue: req.DiscountValue,
		Notes:         req.Notes,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	var subTotal float64
	for _, itemReq := range req.Items {
		variant, err := s.variantRepo.GetByID(ctx, itemReq.ProductVariantID)
		if err != nil {
			return nil, appErrors.NotFound("product variant")
		}

		// Resolve actual product name
		productName := variant.Name
		if product, err := s.productRepo.GetByID(ctx, variant.ProductID); err == nil {
			productName = product.Name
		}

		itemDiscount := 0.0
		if itemReq.DiscountType == "percentage" {
			itemDiscount = itemReq.UnitPrice * float64(itemReq.Quantity) * itemReq.DiscountValue / 100
		} else if itemReq.DiscountType == "fixed" {
			itemDiscount = itemReq.DiscountValue
		}

		totalPrice := itemReq.UnitPrice*float64(itemReq.Quantity) - itemDiscount

		item := model.OrderItem{
			ID:               uuid.New(),
			ProductVariantID: itemReq.ProductVariantID,
			ProductName:      productName,
			VariantName:      variant.Name,
			SKU:              variant.SKU,
			Quantity:         itemReq.Quantity,
			UnitPrice:        itemReq.UnitPrice,
			DiscountType:     itemReq.DiscountType,
			DiscountValue:    itemReq.DiscountValue,
			DiscountAmount:   itemDiscount,
			TotalPrice:       totalPrice,
			WarrantyMonths:   itemReq.WarrantyMonths,
			Notes:            itemReq.Notes,
			CreatedAt:        now,
		}
		order.Items = append(order.Items, item)
		subTotal += totalPrice
	}

	order.SubTotal = subTotal

	if req.DiscountType == "percentage" {
		order.DiscountAmount = subTotal * req.DiscountValue / 100
	} else if req.DiscountType == "fixed" {
		order.DiscountAmount = req.DiscountValue
	}

	order.TotalAmount = subTotal - order.DiscountAmount + order.TaxAmount

	var paidAmount float64
	for _, payReq := range req.Payments {
		payment := model.Payment{
			ID:            uuid.New(),
			Method:        payReq.Method,
			Amount:        payReq.Amount,
			Status:        model.PaymentStatusCompleted,
			TransactionID: payReq.TransactionID,
			Notes:         payReq.Notes,
			PaidAt:        &now,
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		order.Payments = append(order.Payments, payment)
		paidAmount += payReq.Amount
	}

	order.PaidAmount = paidAmount
	order.ChangeAmount = paidAmount - order.TotalAmount
	if order.ChangeAmount < 0 {
		order.ChangeAmount = 0
	}

	if err := s.orderRepo.Create(ctx, order); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create order: %w", err))
	}

	// Deduct inventory and create "out" movement for each item
	for _, item := range order.Items {
		inv, err := s.invRepo.GetByVariantID(ctx, storeID, item.ProductVariantID)
		if err == nil {
			previousQty := inv.Quantity
			newQty := previousQty - item.Quantity
			if newQty < 0 {
				newQty = 0
			}
			_ = s.invRepo.UpdateQuantity(ctx, inv.ID, newQty)

			// Create inventory movement record
			movement := &model.InventoryMovement{
				ID:               uuid.New(),
				StoreID:          storeID,
				ProductVariantID: item.ProductVariantID,
				Type:             "out",
				Quantity:         item.Quantity,
				PreviousQty:      previousQty,
				NewQty:           newQty,
				ReferenceType:    "order",
				ReferenceID:      &order.ID,
				Notes:            fmt.Sprintf("Bán hàng - Đơn %s", order.OrderNumber),
				CreatedBy:        userID,
				CreatedAt:        now,
			}
			_ = s.invRepo.CreateMovement(ctx, movement)
		}
	}

	if order.CustomerID != nil {
		customer, err := s.customerRepo.GetByID(ctx, *order.CustomerID)
		if err == nil {
			_ = s.customerRepo.UpdateStats(ctx, customer.ID, customer.TotalSpent+order.TotalAmount, customer.OrderCount+1)
		}
	}

	// Update POS session sales totals
	if order.POSSessionID != nil {
		if session, err := s.posSessionRepo.GetByID(ctx, *order.POSSessionID); err == nil {
			newSales := session.TotalSales + order.TotalAmount
			newOrders := session.TotalOrders + 1
			_ = s.posSessionRepo.UpdateSales(ctx, session.ID, newSales, newOrders)
		}
	}

	return s.GetByID(ctx, order.ID)
}

func (s *orderService) GetByID(ctx context.Context, id uuid.UUID) (*dto.OrderResponse, error) {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("order")
	}

	// Load customer
	if order.CustomerID != nil {
		if customer, err := s.customerRepo.GetByID(ctx, *order.CustomerID); err == nil {
			order.Customer = customer
		}
	}

	return toOrderResponse(order), nil
}

func (s *orderService) List(ctx context.Context, storeID uuid.UUID, params *dto.OrderListParams) ([]dto.OrderResponse, int64, error) {
	repoParams := repository.OrderListParams{
		Page:       params.Page,
		Limit:      params.Limit,
		Search:     params.Search,
		Status:     params.Status,
		CustomerID: params.CustomerID,
		UserID:     params.UserID,
		DateFrom:   params.DateFrom,
		DateTo:     params.DateTo,
		SortBy:     params.SortBy,
		SortOrder:  params.SortOrder,
	}

	orders, total, err := s.orderRepo.List(ctx, storeID, repoParams)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.OrderResponse
	for i := range orders {
		// Load full order data (items + payments)
		fullOrder, err := s.orderRepo.GetByID(ctx, orders[i].ID)
		if err != nil {
			// Fallback to header-only
			fullOrder = &orders[i]
		}

		// Load customer
		if fullOrder.CustomerID != nil {
			if customer, err := s.customerRepo.GetByID(ctx, *fullOrder.CustomerID); err == nil {
				fullOrder.Customer = customer
			}
		}

		responses = append(responses, *toOrderResponse(fullOrder))
	}
	return responses, total, nil
}

func (s *orderService) Cancel(ctx context.Context, id uuid.UUID, reason string) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("order")
	}

	if order.Status == model.OrderStatusCancelled || order.Status == model.OrderStatusRefunded {
		return appErrors.BadRequest("Đơn hàng không thể hủy")
	}

	if err := s.orderRepo.UpdateStatus(ctx, id, model.OrderStatusCancelled); err != nil {
		return appErrors.Internal(fmt.Errorf("failed to cancel order: %w", err))
	}

	// Restore inventory and create "in" movement for each item
	for _, item := range order.Items {
		inv, err := s.invRepo.GetByVariantID(ctx, order.StoreID, item.ProductVariantID)
		if err == nil {
			previousQty := inv.Quantity
			newQty := previousQty + item.Quantity
			_ = s.invRepo.UpdateQuantity(ctx, inv.ID, newQty)

			movement := &model.InventoryMovement{
				ID:               uuid.New(),
				StoreID:          order.StoreID,
				ProductVariantID: item.ProductVariantID,
				Type:             "in",
				Quantity:         item.Quantity,
				PreviousQty:      previousQty,
				NewQty:           newQty,
				ReferenceType:    "order",
				ReferenceID:      &order.ID,
				Notes:            fmt.Sprintf("Hủy đơn - Đơn %s", order.OrderNumber),
				CreatedBy:        uuid.Nil,
				CreatedAt:        time.Now(),
			}
			_ = s.invRepo.CreateMovement(ctx, movement)
		}
	}

	return nil
}

func (s *orderService) Refund(ctx context.Context, id uuid.UUID, reason string) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("order")
	}

	if order.Status != model.OrderStatusCompleted && order.Status != model.OrderStatusConfirmed {
		return appErrors.BadRequest("Chỉ hoàn trả đơn hàng đã hoàn thành")
	}

	if err := s.orderRepo.UpdateStatus(ctx, id, model.OrderStatusRefunded); err != nil {
		return appErrors.Internal(fmt.Errorf("failed to refund order: %w", err))
	}

	// Restore inventory and create "in" movement for each item
	for _, item := range order.Items {
		inv, err := s.invRepo.GetByVariantID(ctx, order.StoreID, item.ProductVariantID)
		if err == nil {
			previousQty := inv.Quantity
			newQty := previousQty + item.Quantity
			_ = s.invRepo.UpdateQuantity(ctx, inv.ID, newQty)

			movement := &model.InventoryMovement{
				ID:               uuid.New(),
				StoreID:          order.StoreID,
				ProductVariantID: item.ProductVariantID,
				Type:             "in",
				Quantity:         item.Quantity,
				PreviousQty:      previousQty,
				NewQty:           newQty,
				ReferenceType:    "order",
				ReferenceID:      &order.ID,
				Notes:            fmt.Sprintf("Hoàn trả - Đơn %s", order.OrderNumber),
				CreatedBy:        uuid.Nil,
				CreatedAt:        time.Now(),
			}
			_ = s.invRepo.CreateMovement(ctx, movement)
		}
	}

	return nil
}

func (s *orderService) GetDailySummary(ctx context.Context, storeID uuid.UUID, date string) (map[string]interface{}, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	// Parse date and compute start/end in local timezone
	loc := time.Now().Location()
	t, err := time.ParseInLocation("2006-01-02", date, loc)
	if err != nil {
		t = time.Now()
	}
	start := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc)
	end := start.AddDate(0, 0, 1)

	totalAmount, totalOrders, err := s.orderRepo.GetDailySales(ctx, storeID, start, end)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"date":         date,
		"total_amount": totalAmount,
		"total_orders": totalOrders,
	}, nil
}

func (s *orderService) GetCustomerPurchasedItems(ctx context.Context, storeID, customerID uuid.UUID) ([]dto.CustomerPurchasedItemResponse, error) {
	return s.orderRepo.GetCustomerPurchasedItems(ctx, storeID, customerID)
}

func toOrderResponse(order *model.Order) *dto.OrderResponse {
	resp := &dto.OrderResponse{
		ID:             order.ID,
		StoreID:        order.StoreID,
		CustomerID:     order.CustomerID,
		UserID:         order.UserID,
		OrderNumber:    order.OrderNumber,
		Status:         order.Status,
		SubTotal:       order.SubTotal,
		DiscountType:   order.DiscountType,
		DiscountValue:  order.DiscountValue,
		DiscountAmount: order.DiscountAmount,
		TaxAmount:      order.TaxAmount,
		TotalAmount:    order.TotalAmount,
		PaidAmount:     order.PaidAmount,
		ChangeAmount:   order.ChangeAmount,
		Notes:          order.Notes,
		CreatedAt:      order.CreatedAt,
		UpdatedAt:      order.UpdatedAt,
	}

	// Map customer
	if order.Customer != nil {
		resp.Customer = toCustomerResponse(order.Customer)
	}

	for _, item := range order.Items {
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

	for _, p := range order.Payments {
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
