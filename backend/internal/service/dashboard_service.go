package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/repository"
)

type dashboardService struct {
	orderRepo     repository.OrderRepository
	inventoryRepo repository.InventoryRepository
}

func NewDashboardService(
	orderRepo repository.OrderRepository,
	inventoryRepo repository.InventoryRepository,
) DashboardService {
	return &dashboardService{
		orderRepo:     orderRepo,
		inventoryRepo: inventoryRepo,
	}
}

func (s *dashboardService) GetSummary(ctx context.Context, storeID uuid.UUID) (*dto.DashboardSummary, error) {
	today := time.Now().Format("2006-01-02")

	todayRevenue, todayOrders, _ := s.orderRepo.GetDailySales(ctx, storeID, today)

	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	yesterdayRevenue, yesterdayOrders, _ := s.orderRepo.GetDailySales(ctx, storeID, yesterday)

	lowStockItems, lowStockCount, _ := s.inventoryRepo.GetLowStock(ctx, storeID, 1, 1)
	_ = lowStockItems

	var revenueChange, orderChange float64
	if yesterdayRevenue > 0 {
		revenueChange = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
	}
	if yesterdayOrders > 0 {
		orderChange = ((float64(todayOrders) - float64(yesterdayOrders)) / float64(yesterdayOrders)) * 100
	}

	// Calculate month totals
	var monthRevenue float64
	var monthOrders int
	now := time.Now()
	for d := 1; d <= now.Day(); d++ {
		date := fmt.Sprintf("%d-%02d-%02d", now.Year(), now.Month(), d)
		rev, orders, _ := s.orderRepo.GetDailySales(ctx, storeID, date)
		monthRevenue += rev
		monthOrders += orders
	}

	return &dto.DashboardSummary{
		TodayRevenue:  todayRevenue,
		TodayOrders:   todayOrders,
		LowStockCount: int(lowStockCount),
		MonthRevenue:  monthRevenue,
		MonthOrders:   monthOrders,
		RevenueChange: revenueChange,
		OrderChange:   orderChange,
	}, nil
}

func (s *dashboardService) GetSalesChart(ctx context.Context, storeID uuid.UUID, period string, days int) ([]dto.SalesChartPoint, error) {
	if days <= 0 {
		days = 7
	}
	if days > 90 {
		days = 90
	}

	var points []dto.SalesChartPoint
	for i := days - 1; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i)
		dateStr := date.Format("2006-01-02")
		rev, orders, _ := s.orderRepo.GetDailySales(ctx, storeID, dateStr)
		points = append(points, dto.SalesChartPoint{
			Date:    dateStr,
			Revenue: rev,
			Orders:  orders,
		})
	}

	return points, nil
}

func (s *dashboardService) GetTopProducts(ctx context.Context, storeID uuid.UUID, limit int) ([]dto.TopProductItem, error) {
	// For now return an empty list – to be implemented with a proper aggregate query
	return []dto.TopProductItem{}, nil
}
