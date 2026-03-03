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

type roleService struct {
	roleRepo repository.RoleRepository
}

func NewRoleService(roleRepo repository.RoleRepository) RoleService {
	return &roleService{roleRepo: roleRepo}
}

func (s *roleService) Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateRoleRequest) (*dto.RoleResponse, error) {
	// Check if name already exists
	existing, _ := s.roleRepo.GetByName(ctx, req.Name)
	if existing != nil {
		return nil, appErrors.Conflict("Tên vai trò đã tồn tại")
	}

	now := time.Now()
	role := &model.Role{
		ID:          uuid.New(),
		StoreID:     &storeID,
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		Permissions: model.JSONB{"permissions": req.Permissions},
		IsSystem:    false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.roleRepo.Create(ctx, role); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create role: %w", err))
	}

	return toRoleResponse(role), nil
}

func (s *roleService) GetByID(ctx context.Context, id uuid.UUID) (*dto.RoleResponse, error) {
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("role")
	}
	return toRoleResponse(role), nil
}

func (s *roleService) List(ctx context.Context, storeID uuid.UUID) ([]dto.RoleResponse, error) {
	// Get store-specific roles
	storeRoles, err := s.roleRepo.GetByStoreID(ctx, storeID)
	if err != nil {
		return nil, err
	}

	// Get system roles
	systemRoles, err := s.roleRepo.GetSystemRoles(ctx)
	if err != nil {
		return nil, err
	}

	allRoles := append(systemRoles, storeRoles...)
	seen := make(map[uuid.UUID]bool)
	var responses []dto.RoleResponse
	for i := range allRoles {
		if seen[allRoles[i].ID] {
			continue
		}
		seen[allRoles[i].ID] = true
		responses = append(responses, *toRoleResponse(&allRoles[i]))
	}
	return responses, nil
}

func (s *roleService) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateRoleRequest) (*dto.RoleResponse, error) {
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("role")
	}

	if role.IsSystem {
		return nil, appErrors.Forbidden("Không thể chỉnh sửa vai trò hệ thống")
	}

	if req.DisplayName != "" {
		role.DisplayName = req.DisplayName
	}
	if req.Description != "" {
		role.Description = req.Description
	}
	if req.Permissions != nil {
		role.Permissions = model.JSONB{"permissions": req.Permissions}
	}

	if err := s.roleRepo.Update(ctx, role); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update role: %w", err))
	}

	return toRoleResponse(role), nil
}

func (s *roleService) Delete(ctx context.Context, id uuid.UUID) error {
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("role")
	}

	if role.IsSystem {
		return appErrors.Forbidden("Không thể xóa vai trò hệ thống")
	}

	return s.roleRepo.Delete(ctx, id)
}

func toRoleResponse(role *model.Role) *dto.RoleResponse {
	permissions := make([]string, 0)
	if perms, ok := role.Permissions["permissions"]; ok {
		if permList, ok := perms.([]interface{}); ok {
			for _, p := range permList {
				if str, ok := p.(string); ok {
					permissions = append(permissions, str)
				}
			}
		}
	}
	return &dto.RoleResponse{
		ID:          role.ID,
		Name:        role.Name,
		DisplayName: role.DisplayName,
		Description: role.Description,
		Permissions: permissions,
		IsSystem:    role.IsSystem,
	}
}
