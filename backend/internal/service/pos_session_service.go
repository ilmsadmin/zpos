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

type posSessionService struct {
	sessionRepo repository.POSSessionRepository
	orderRepo   repository.OrderRepository
	userRepo    repository.UserRepository
}

func NewPOSSessionService(sessionRepo repository.POSSessionRepository, orderRepo repository.OrderRepository, userRepo repository.UserRepository) POSSessionService {
	return &posSessionService{sessionRepo: sessionRepo, orderRepo: orderRepo, userRepo: userRepo}
}

func (s *posSessionService) Open(ctx context.Context, storeID, userID uuid.UUID, req *dto.OpenPOSSessionRequest) (*dto.POSSessionResponse, error) {
	existing, _ := s.sessionRepo.GetOpenSession(ctx, storeID, userID)
	if existing != nil {
		return nil, appErrors.Conflict("Đã có phiên POS đang mở")
	}

	now := time.Now()
	session := &model.POSSession{
		ID:            uuid.New(),
		StoreID:       storeID,
		UserID:        userID,
		OpeningAmount: req.OpeningAmount,
		Notes:         req.Notes,
		Status:        "open",
		OpenedAt:      now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create POS session: %w", err))
	}

	return s.toSessionResponseWithUser(ctx, session), nil
}

func (s *posSessionService) Close(ctx context.Context, sessionID uuid.UUID, req *dto.ClosePOSSessionRequest) (*dto.POSSessionResponse, error) {
	session, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, appErrors.NotFound("POS session")
	}

	if session.Status != "open" {
		return nil, appErrors.BadRequest("Phiên POS đã đóng")
	}

	closingAmount := req.ClosingAmount
	expectedAmount := session.OpeningAmount + session.TotalSales
	difference := closingAmount - expectedAmount

	session.ClosingAmount = &closingAmount
	session.ExpectedAmount = &expectedAmount
	session.Difference = &difference
	session.Notes = req.Notes

	if err := s.sessionRepo.Close(ctx, session); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to close POS session: %w", err))
	}

	session.Status = "closed"
	return s.toSessionResponseWithUser(ctx, session), nil
}

func (s *posSessionService) GetCurrent(ctx context.Context, storeID, userID uuid.UUID) (*dto.POSSessionResponse, error) {
	session, err := s.sessionRepo.GetOpenSession(ctx, storeID, userID)
	if err != nil {
		return nil, appErrors.NotFound("POS session")
	}
	return s.toSessionResponseWithUser(ctx, session), nil
}

func (s *posSessionService) List(ctx context.Context, storeID uuid.UUID, page, limit int) ([]dto.POSSessionResponse, int64, error) {
	sessions, total, err := s.sessionRepo.List(ctx, storeID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.POSSessionResponse
	for i := range sessions {
		responses = append(responses, *s.toSessionResponseWithUser(ctx, &sessions[i]))
	}
	return responses, total, nil
}

func (s *posSessionService) toSessionResponseWithUser(ctx context.Context, sess *model.POSSession) *dto.POSSessionResponse {
	userName := ""
	if user, err := s.userRepo.GetByID(ctx, sess.UserID); err == nil {
		userName = user.FullName
	}

	return &dto.POSSessionResponse{
		ID:             sess.ID,
		StoreID:        sess.StoreID,
		UserID:         sess.UserID,
		UserName:       userName,
		OpeningAmount:  sess.OpeningAmount,
		ClosingAmount:  sess.ClosingAmount,
		ExpectedAmount: sess.ExpectedAmount,
		Difference:     sess.Difference,
		TotalSales:     sess.TotalSales,
		TotalOrders:    sess.TotalOrders,
		Status:         sess.Status,
		Notes:          sess.Notes,
		OpenedAt:       sess.OpenedAt,
		ClosedAt:       sess.ClosedAt,
	}
}
