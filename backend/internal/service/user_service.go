package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
	"github.com/zplus/pos/pkg/auth"
	appErrors "github.com/zplus/pos/pkg/errors"
)

type userService struct {
	userRepo repository.UserRepository
	roleRepo repository.RoleRepository
	jwt      *auth.JWTManager
}

func NewUserService(userRepo repository.UserRepository, roleRepo repository.RoleRepository, jwt *auth.JWTManager) UserService {
	return &userService{userRepo: userRepo, roleRepo: roleRepo, jwt: jwt}
}

func (s *userService) Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateUserRequest) (*dto.UserResponse, error) {
	existing, _ := s.userRepo.GetByEmail(ctx, req.Email)
	if existing != nil {
		return nil, appErrors.Conflict("Email đã được sử dụng")
	}

	role, err := s.roleRepo.GetByID(ctx, req.RoleID)
	if err != nil {
		return nil, appErrors.NotFound("role")
	}

	hashedPassword, err := auth.HashPassword(req.Password, nil)
	if err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to hash password: %w", err))
	}

	now := time.Now()
	user := &model.User{
		ID:           uuid.New(),
		StoreID:      storeID,
		RoleID:       req.RoleID,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FullName:     req.FullName,
		Phone:        req.Phone,
		IsActive:     req.IsActive,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create user: %w", err))
	}

	resp := toUserResponse(user, role)
	return &resp, nil
}

func (s *userService) GetByID(ctx context.Context, id uuid.UUID) (*dto.UserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("user")
	}

	role, _ := s.roleRepo.GetByID(ctx, user.RoleID)
	resp := toUserResponse(user, role)
	return &resp, nil
}

func (s *userService) List(ctx context.Context, storeID uuid.UUID, page, limit int) ([]dto.UserResponse, int64, error) {
	users, total, err := s.userRepo.GetByStoreID(ctx, storeID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.UserResponse
	for i := range users {
		role, _ := s.roleRepo.GetByID(ctx, users[i].RoleID)
		responses = append(responses, toUserResponse(&users[i], role))
	}
	return responses, total, nil
}

func (s *userService) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateUserRequest) (*dto.UserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("user")
	}

	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.RoleID != uuid.Nil {
		if _, err := s.roleRepo.GetByID(ctx, req.RoleID); err != nil {
			return nil, appErrors.NotFound("role")
		}
		user.RoleID = req.RoleID
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update user: %w", err))
	}

	role, _ := s.roleRepo.GetByID(ctx, user.RoleID)
	resp := toUserResponse(user, role)
	return &resp, nil
}

func (s *userService) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("user")
	}
	return s.userRepo.Delete(ctx, id)
}
