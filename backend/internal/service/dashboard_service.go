package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/config"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/repository"
)

type dashboardService struct {
	orderRepo     repository.OrderRepository
	inventoryRepo repository.InventoryRepository
	location      *time.Location
}

func NewDashboardService(
	orderRepo repository.OrderRepository,
	inventoryRepo repository.InventoryRepository,
	cfg *config.Config,
) DashboardService {
	tz := cfg.App.Timezone
	if tz == "" {
		tz = "Asia/Ho_Chi_Minh"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.FixedZone("ICT", 7*3600)
	}
	return &dashboardService{
		orderRepo:     orderRepo,
		inventoryRepo: inventoryRepo,
		location:      loc,
	}
}

// dayRange returns the start (inclusive) and end (exclusive) of a given date in the configured timezone.
func (s *dashboardService) dayRange(t time.Time) (time.Time, time.Time) {
	y, m, d := t.In(s.location).Date()
	start := time.Date(y, m, d, 0, 0, 0, 0, s.location)
	end := start.AddDate(0, 0, 1)
	return start, end
}

func (s *dashboardService) GetSummary(ctx context.Context, storeID uuid.UUID) (*dto.DashboardSummary, error) {
	now := time.Now().In(s.location)

	todayStart, todayEnd := s.dayRange(now)
	todayRevenue, todayOrders, _ := s.orderRepo.GetDailySales(ctx, storeID, todayStart, todayEnd)

	yesterday := now.AddDate(0, 0, -1)
	ydayStart, ydayEnd := s.dayRange(yesterday)
	yesterdayRevenue, yesterdayOrders, _ := s.orderRepo.GetDailySales(ctx, storeID, ydayStart, ydayEnd)

	lowStockItems, lowStockCount, _ := s.inventoryRepo.GetLowStock(ctx, storeID, 1, 1)
	_ = lowStockItems

	var revenueChange, orderChange float64
	if yesterdayRevenue > 0 {
		revenueChange = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
	}
	if yesterdayOrders > 0 {
		orderChange = ((float64(todayOrders) - float64(yesterdayOrders)) / float64(yesterdayOrders)) * 100
	}

	// Month totals: from 1st of the month to end of today
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, s.location)
	monthRevenue, monthOrders, _ := s.orderRepo.GetDailySales(ctx, storeID, monthStart, todayEnd)

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

	now := time.Now().In(s.location)
	var points []dto.SalesChartPoint
	for i := days - 1; i >= 0; i-- {
		day := now.AddDate(0, 0, -i)
		start, end := s.dayRange(day)
		dateStr := day.Format("2006-01-02")
		rev, orders, _ := s.orderRepo.GetDailySales(ctx, storeID, start, end)
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
