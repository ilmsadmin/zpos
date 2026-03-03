package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/zplus/pos/internal/middleware"
	"github.com/zplus/pos/internal/service"
	"github.com/zplus/pos/pkg/response"
)

type DashboardHandler struct {
	dashboardService service.DashboardService
}

func NewDashboardHandler(dashboardService service.DashboardService) *DashboardHandler {
	return &DashboardHandler{dashboardService: dashboardService}
}

// GetSummary godoc
// @Summary Get dashboard summary KPIs
// @Tags Dashboard
// @Produce json
// @Success 200 {object} dto.DashboardSummary
// @Security BearerAuth
// @Router /api/v1/dashboard/summary [get]
func (h *DashboardHandler) GetSummary(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	result, err := h.dashboardService.GetSummary(c.Context(), storeID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// GetSalesChart godoc
// @Summary Get sales chart data
// @Tags Dashboard
// @Produce json
// @Param days query int false "Number of days" default(7)
// @Param period query string false "Period: day, week, month"
// @Success 200 {array} dto.SalesChartPoint
// @Security BearerAuth
// @Router /api/v1/dashboard/sales-chart [get]
func (h *DashboardHandler) GetSalesChart(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	days := c.QueryInt("days", 7)
	period := c.Query("period", "day")

	result, err := h.dashboardService.GetSalesChart(c.Context(), storeID, period, days)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// GetTopProducts godoc
// @Summary Get top selling products
// @Tags Dashboard
// @Produce json
// @Param limit query int false "Number of products"
// @Success 200 {array} dto.TopProductItem
// @Security BearerAuth
// @Router /api/v1/dashboard/top-products [get]
func (h *DashboardHandler) GetTopProducts(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	limit := c.QueryInt("limit", 10)

	result, err := h.dashboardService.GetTopProducts(c.Context(), storeID, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}
