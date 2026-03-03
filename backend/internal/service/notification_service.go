package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
	appErrors "github.com/zplus/pos/pkg/errors"
)

type notificationService struct {
	notifRepo repository.NotificationRepository
	userRepo  repository.UserRepository
	log       zerolog.Logger
}

func NewNotificationService(
	notifRepo repository.NotificationRepository,
	userRepo repository.UserRepository,
	log zerolog.Logger,
) NotificationService {
	return &notificationService{
		notifRepo: notifRepo,
		userRepo:  userRepo,
		log:       log,
	}
}

func (s *notificationService) List(ctx context.Context, storeID, userID uuid.UUID, params *dto.NotificationListParams) ([]dto.NotificationResponse, int64, error) {
	repoParams := repository.NotificationListParams{
		Page:  params.Page,
		Limit: params.Limit,
		Type:  params.Type,
	}
	if params.IsRead != nil {
		repoParams.IsRead = params.IsRead
	}

	notifications, total, err := s.notifRepo.List(ctx, storeID, userID, repoParams)
	if err != nil {
		return nil, 0, appErrors.Internal(fmt.Errorf("failed to list notifications: %w", err))
	}

	var responses []dto.NotificationResponse
	for _, n := range notifications {
		responses = append(responses, toNotificationResponse(&n))
	}
	return responses, total, nil
}

func (s *notificationService) GetUnreadCount(ctx context.Context, storeID, userID uuid.UUID) (int64, error) {
	count, err := s.notifRepo.CountUnread(ctx, storeID, userID)
	if err != nil {
		return 0, appErrors.Internal(fmt.Errorf("failed to count unread notifications: %w", err))
	}
	return count, nil
}

func (s *notificationService) MarkAsRead(ctx context.Context, id string) error {
	if err := s.notifRepo.MarkAsRead(ctx, id); err != nil {
		return appErrors.Internal(fmt.Errorf("failed to mark notification as read: %w", err))
	}
	return nil
}

func (s *notificationService) MarkAllAsRead(ctx context.Context, storeID, userID uuid.UUID) error {
	if err := s.notifRepo.MarkAllAsRead(ctx, storeID, userID); err != nil {
		return appErrors.Internal(fmt.Errorf("failed to mark all notifications as read: %w", err))
	}
	return nil
}

func (s *notificationService) GetPreferences(ctx context.Context, userID uuid.UUID) (*dto.NotificationPreferences, error) {
	prefs, err := s.notifRepo.GetPreferences(ctx, userID)
	if err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to get notification preferences: %w", err))
	}
	return prefs, nil
}

func (s *notificationService) SavePreferences(ctx context.Context, userID uuid.UUID, prefs *dto.NotificationPreferences) error {
	if err := s.notifRepo.SavePreferences(ctx, userID, prefs); err != nil {
		return appErrors.Internal(fmt.Errorf("failed to save notification preferences: %w", err))
	}
	return nil
}

// CreateNotification creates a notification for a specific user (if user prefs allow it).
// If userID is nil, it broadcasts to all users in the store.
func (s *notificationService) CreateNotification(ctx context.Context, req *dto.CreateNotificationRequest) error {
	if req.UserID != nil {
		// Check user's preferences before creating
		prefs, err := s.notifRepo.GetPreferences(ctx, *req.UserID)
		if err != nil {
			s.log.Warn().Err(err).Msg("Failed to get notification prefs, using defaults")
		}
		if prefs != nil && !isNotificationEnabled(prefs, req.Type) {
			// User has disabled this notification type, skip
			return nil
		}
	}

	notif := &model.Notification{
		StoreID:  req.StoreID,
		UserID:   req.UserID,
		Type:     req.Type,
		Title:    req.Title,
		Message:  req.Message,
		Severity: req.Severity,
		Data:     req.Data,
	}

	if err := s.notifRepo.Create(ctx, notif); err != nil {
		s.log.Error().Err(err).Str("type", req.Type).Msg("Failed to create notification")
		return appErrors.Internal(fmt.Errorf("failed to create notification: %w", err))
	}

	s.log.Debug().
		Str("type", req.Type).
		Str("title", req.Title).
		Msg("Notification created")

	return nil
}

// NotifyStoreUsers creates a notification for all users in a store,
// respecting each user's individual notification preferences.
func (s *notificationService) NotifyStoreUsers(ctx context.Context, storeID uuid.UUID, notifType, title, message, severity string, data map[string]interface{}) {
	// Get all users of the store
	users, _, err := s.userRepo.GetByStoreID(ctx, storeID, 1, 1000) // Get up to 1000 users
	if err != nil {
		s.log.Error().Err(err).Msg("Failed to get store users for notification")
		return
	}

	for _, user := range users {
		uid := user.ID
		req := &dto.CreateNotificationRequest{
			StoreID:  storeID,
			UserID:   &uid,
			Type:     notifType,
			Title:    title,
			Message:  message,
			Severity: severity,
			Data:     data,
		}

		if err := s.CreateNotification(ctx, req); err != nil {
			s.log.Error().Err(err).
				Str("user_id", user.ID.String()).
				Str("type", notifType).
				Msg("Failed to create notification for user")
		}
	}
}

// isNotificationEnabled checks if a specific notification type is enabled in user preferences
func isNotificationEnabled(prefs *dto.NotificationPreferences, notifType string) bool {
	switch notifType {
	case model.NotifTypeNewOrder:
		return prefs.NewOrder
	case model.NotifTypeLowStock:
		return prefs.LowStock
	case model.NotifTypeWarrantyExpiry:
		return prefs.WarrantyExpiry
	case model.NotifTypeWarrantyRequest:
		return prefs.WarrantyRequest
	case model.NotifTypeDailyReport:
		return prefs.DailyReport
	case model.NotifTypeSystem:
		return true // System notifications always enabled
	default:
		return true
	}
}

func toNotificationResponse(n *model.Notification) dto.NotificationResponse {
	return dto.NotificationResponse{
		ID:        n.ID,
		StoreID:   n.StoreID,
		UserID:    n.UserID,
		Type:      n.Type,
		Title:     n.Title,
		Message:   n.Message,
		Severity:  n.Severity,
		Data:      n.Data,
		IsRead:    n.IsRead,
		ReadAt:    n.ReadAt,
		CreatedAt: n.CreatedAt,
	}
}
