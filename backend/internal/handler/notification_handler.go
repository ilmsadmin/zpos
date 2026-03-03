package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/middleware"
	"github.com/zplus/pos/internal/service"
	"github.com/zplus/pos/internal/validator"
	appErrors "github.com/zplus/pos/pkg/errors"
	"github.com/zplus/pos/pkg/response"
)

type NotificationHandler struct {
	notifService service.NotificationService
	validate     *validator.CustomValidator
}

func NewNotificationHandler(notifService service.NotificationService, validate *validator.CustomValidator) *NotificationHandler {
	return &NotificationHandler{
		notifService: notifService,
		validate:     validate,
	}
}

// List godoc
// @Summary List notifications
// @Tags Notifications
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Param type query string false "Filter by type"
// @Success 200 {array} dto.NotificationResponse
// @Security BearerAuth
// @Router /api/v1/notifications [get]
func (h *NotificationHandler) List(c *fiber.Ctx) error {
	var params dto.NotificationListParams
	if err := c.QueryParser(&params); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid query parameters"))
	}

	claims := middleware.GetClaims(c)
	storeID := middleware.GetStoreID(c)

	notifications, total, err := h.notifService.List(c.Context(), storeID, claims.UserID, &params)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}
	return response.Paginated(c, notifications, page, limit, total)
}

// GetUnreadCount godoc
// @Summary Get unread notification count
// @Tags Notifications
// @Produce json
// @Success 200 {object} map[string]int64
// @Security BearerAuth
// @Router /api/v1/notifications/unread-count [get]
func (h *NotificationHandler) GetUnreadCount(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	storeID := middleware.GetStoreID(c)

	count, err := h.notifService.GetUnreadCount(c.Context(), storeID, claims.UserID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, fiber.Map{"unread_count": count})
}

// MarkAsRead godoc
// @Summary Mark a notification as read
// @Tags Notifications
// @Param id path string true "Notification ID"
// @Success 200
// @Security BearerAuth
// @Router /api/v1/notifications/{id}/read [put]
func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.Error(c, appErrors.BadRequest("Notification ID is required"))
	}

	if err := h.notifService.MarkAsRead(c.Context(), id); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, nil, "Đã đánh dấu đã đọc")
}

// MarkAllAsRead godoc
// @Summary Mark all notifications as read
// @Tags Notifications
// @Success 200
// @Security BearerAuth
// @Router /api/v1/notifications/read-all [put]
func (h *NotificationHandler) MarkAllAsRead(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	storeID := middleware.GetStoreID(c)

	if err := h.notifService.MarkAllAsRead(c.Context(), storeID, claims.UserID); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, nil, "Đã đánh dấu tất cả đã đọc")
}

// GetPreferences godoc
// @Summary Get notification preferences
// @Tags Notifications
// @Produce json
// @Success 200 {object} dto.NotificationPreferences
// @Security BearerAuth
// @Router /api/v1/notifications/preferences [get]
func (h *NotificationHandler) GetPreferences(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)

	prefs, err := h.notifService.GetPreferences(c.Context(), claims.UserID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, prefs)
}

// SavePreferences godoc
// @Summary Save notification preferences
// @Tags Notifications
// @Accept json
// @Produce json
// @Param body body dto.UpdateNotificationPrefsRequest true "Preferences"
// @Success 200 {object} dto.NotificationPreferences
// @Security BearerAuth
// @Router /api/v1/notifications/preferences [put]
func (h *NotificationHandler) SavePreferences(c *fiber.Ctx) error {
	var req dto.UpdateNotificationPrefsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}

	claims := middleware.GetClaims(c)

	if err := h.notifService.SavePreferences(c.Context(), claims.UserID, &req.Preferences); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, req.Preferences, "Đã lưu cài đặt thông báo")
}
