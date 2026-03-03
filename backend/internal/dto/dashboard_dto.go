package dto

import "time"

// --- Dashboard DTOs ---

type DashboardSummary struct {
	TodayRevenue    float64 `json:"today_revenue"`
	TodayOrders     int     `json:"today_orders"`
	TodayCustomers  int     `json:"today_customers"`
	LowStockCount   int     `json:"low_stock_count"`
	MonthRevenue    float64 `json:"month_revenue"`
	MonthOrders     int     `json:"month_orders"`
	RevenueChange   float64 `json:"revenue_change"`
	OrderChange     float64 `json:"order_change"`
	PendingWarranty int     `json:"pending_warranty"`
}

type SalesChartPoint struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Orders  int     `json:"orders"`
}

type TopProductItem struct {
	ProductID   string  `json:"product_id"`
	ProductName string  `json:"product_name"`
	SKU         string  `json:"sku"`
	Quantity    int     `json:"quantity"`
	Revenue     float64 `json:"revenue"`
}

type RecentOrderItem struct {
	ID          string    `json:"id"`
	OrderNumber string    `json:"order_number"`
	Customer    string    `json:"customer"`
	Total       float64   `json:"total"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}
