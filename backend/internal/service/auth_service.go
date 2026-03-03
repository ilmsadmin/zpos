package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
	"github.com/zplus/pos/pkg/auth"
	appErrors "github.com/zplus/pos/pkg/errors"
)

type authService struct {
	userRepo repository.UserRepository
	roleRepo repository.RoleRepository
	jwt      *auth.JWTManager
	log      zerolog.Logger
}

func NewAuthService(
	userRepo repository.UserRepository,
	roleRepo repository.RoleRepository,
	jwt *auth.JWTManager,
	log zerolog.Logger,
) AuthService {
	return &authService{
		userRepo: userRepo,
		roleRepo: roleRepo,
		jwt:      jwt,
		log:      log.With().Str("service", "auth").Logger(),
	}
}

func (s *authService) Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, appErrors.Unauthorized("Invalid email or password")
	}

	if !user.IsActive {
		return nil, appErrors.Forbidden("Account is deactivated")
	}

	// Verify password
	valid, err := auth.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil || !valid {
		return nil, appErrors.Unauthorized("Invalid email or password")
	}

	// Get role
	role, err := s.roleRepo.GetByID(ctx, user.RoleID)
	if err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to get user role: %w", err))
	}

	// Generate tokens
	tokenPair, err := s.jwt.GenerateTokenPair(user.ID, user.StoreID, role.ID, role.Name)
	if err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to generate tokens: %w", err))
	}

	// Update last login
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	s.log.Info().Str("user_id", user.ID.String()).Str("email", user.Email).Msg("User logged in")

	return &dto.LoginResponse{
		User:         toUserResponse(user, role),
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresIn:    tokenPair.ExpiresIn,
	}, nil
}

func (s *authService) Register(ctx context.Context, storeID uuid.UUID, req *dto.RegisterRequest) (*dto.UserResponse, error) {
	// Check if email exists
	existing, _ := s.userRepo.GetByEmail(ctx, req.Email)
	if existing != nil {
		return nil, appErrors.Conflict("Email already registered")
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password, nil)
	if err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to hash password: %w", err))
	}

	// Get default role (staff)
	defaultRole, err := s.roleRepo.GetByName(ctx, "staff")
	if err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to get default role: %w", err))
	}

	user := &model.User{
		ID:           uuid.New(),
		StoreID:      storeID,
		RoleID:       defaultRole.ID,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FullName:     req.FullName,
		Phone:        req.Phone,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create user: %w", err))
	}

	s.log.Info().Str("user_id", user.ID.String()).Str("email", user.Email).Msg("User registered")

	resp := toUserResponse(user, defaultRole)
	return &resp, nil
}

func (s *authService) RefreshToken(ctx context.Context, req *dto.RefreshTokenRequest) (*dto.LoginResponse, error) {
	claims, err := s.jwt.ValidateToken(req.RefreshToken, auth.RefreshToken)
	if err != nil {
		return nil, appErrors.Unauthorized("Invalid refresh token")
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, appErrors.Unauthorized("User not found")
	}

	if !user.IsActive {
		return nil, appErrors.Forbidden("Account is deactivated")
	}

	role, err := s.roleRepo.GetByID(ctx, user.RoleID)
	if err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to get user role: %w", err))
	}

	tokenPair, err := s.jwt.GenerateTokenPair(user.ID, user.StoreID, role.ID, role.Name)
	if err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to generate tokens: %w", err))
	}

	return &dto.LoginResponse{
		User:         toUserResponse(user, role),
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresIn:    tokenPair.ExpiresIn,
	}, nil
}

func (s *authService) ChangePassword(ctx context.Context, userID uuid.UUID, req *dto.ChangePasswordRequest) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return appErrors.NotFound("User")
	}

	valid, err := auth.VerifyPassword(req.CurrentPassword, user.PasswordHash)
	if err != nil || !valid {
		return appErrors.BadRequest("Current password is incorrect")
	}

	hashedPassword, err := auth.HashPassword(req.NewPassword, nil)
	if err != nil {
		return appErrors.Internal(fmt.Errorf("failed to hash password: %w", err))
	}

	user.PasswordHash = hashedPassword
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return appErrors.Internal(fmt.Errorf("failed to update password: %w", err))
	}

	return nil
}

func (s *authService) Logout(ctx context.Context, userID uuid.UUID) error {
	// In a production system, you would blacklist the token in Redis
	s.log.Info().Str("user_id", userID.String()).Msg("User logged out")
	return nil
}

// Helper function to convert model to DTO
func toUserResponse(user *model.User, role *model.Role) dto.UserResponse {
	resp := dto.UserResponse{
		ID:          user.ID,
		StoreID:     user.StoreID,
		Email:       user.Email,
		FullName:    user.FullName,
		Phone:       user.Phone,
		AvatarURL:   user.AvatarURL,
		IsActive:    user.IsActive,
		LastLoginAt: user.LastLoginAt,
		CreatedAt:   user.CreatedAt,
	}
	if role != nil {
		resp.Role = &dto.RoleResponse{
			ID:          role.ID,
			Name:        role.Name,
			DisplayName: role.DisplayName,
		}
	}
	return resp
}
