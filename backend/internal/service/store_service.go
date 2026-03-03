package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
	appErrors "github.com/zplus/pos/pkg/errors"
)

type storeService struct {
	storeRepo repository.StoreRepository
}

func NewStoreService(storeRepo repository.StoreRepository) StoreService {
	return &storeService{storeRepo: storeRepo}
}

func (s *storeService) GetByID(ctx context.Context, id uuid.UUID) (*dto.StoreResponse, error) {
	store, err := s.storeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("store")
	}
	return toStoreResponse(store), nil
}

func (s *storeService) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateStoreRequest) (*dto.StoreResponse, error) {
	store, err := s.storeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("store")
	}

	if req.Name != "" {
		store.Name = req.Name
	}
	if req.Address != "" {
		store.Address = req.Address
	}
	if req.Phone != "" {
		store.Phone = req.Phone
	}
	if req.Email != "" {
		store.Email = req.Email
	}
	if req.Settings != nil {
		store.Settings = model.JSONB(req.Settings)
	}

	if err := s.storeRepo.Update(ctx, store); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update store: %w", err))
	}

	return toStoreResponse(store), nil
}

func (s *storeService) GetAll(ctx context.Context) ([]dto.StoreResponse, error) {
	stores, err := s.storeRepo.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	var responses []dto.StoreResponse
	for i := range stores {
		responses = append(responses, *toStoreResponse(&stores[i]))
	}
	return responses, nil
}

func toStoreResponse(store *model.Store) *dto.StoreResponse {
	return &dto.StoreResponse{
		ID:       store.ID,
		Name:     store.Name,
		Code:     store.Code,
		Address:  store.Address,
		Phone:    store.Phone,
		Email:    store.Email,
		LogoURL:  store.LogoURL,
		IsActive: store.IsActive,
		Settings: map[string]interface{}(store.Settings),
	}
}
