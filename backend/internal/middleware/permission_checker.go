package middleware

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
)

// rolePermissionChecker implements PermissionChecker by loading role permissions from DB
type rolePermissionChecker struct {
	roleRepo repository.RoleRepository
	cache    map[uuid.UUID]*cachedRole
	mu       sync.RWMutex
	ttl      time.Duration
}

type cachedRole struct {
	permissions model.JSONB
	loadedAt    time.Time
}

// NewPermissionChecker creates a new PermissionChecker backed by the role repository
func NewPermissionChecker(roleRepo repository.RoleRepository) PermissionChecker {
	return &rolePermissionChecker{
		roleRepo: roleRepo,
		cache:    make(map[uuid.UUID]*cachedRole),
		ttl:      5 * time.Minute,
	}
}

func (pc *rolePermissionChecker) getPermissions(roleID uuid.UUID) (model.JSONB, error) {
	pc.mu.RLock()
	cached, ok := pc.cache[roleID]
	pc.mu.RUnlock()

	if ok && time.Since(cached.loadedAt) < pc.ttl {
		return cached.permissions, nil
	}

	role, err := pc.roleRepo.GetByID(context.Background(), roleID)
	if err != nil {
		return nil, err
	}

	pc.mu.Lock()
	pc.cache[roleID] = &cachedRole{
		permissions: role.Permissions,
		loadedAt:    time.Now(),
	}
	pc.mu.Unlock()

	return role.Permissions, nil
}

func (pc *rolePermissionChecker) HasPermission(roleID uuid.UUID, permission Permission) (bool, error) {
	perms, err := pc.getPermissions(roleID)
	if err != nil {
		return false, err
	}
	return checkPermission(perms, permission), nil
}

func (pc *rolePermissionChecker) HasAnyPermission(roleID uuid.UUID, permissions ...Permission) (bool, error) {
	perms, err := pc.getPermissions(roleID)
	if err != nil {
		return false, err
	}
	for _, p := range permissions {
		if checkPermission(perms, p) {
			return true, nil
		}
	}
	return false, nil
}

func (pc *rolePermissionChecker) HasAllPermissions(roleID uuid.UUID, permissions ...Permission) (bool, error) {
	perms, err := pc.getPermissions(roleID)
	if err != nil {
		return false, err
	}
	for _, p := range permissions {
		if !checkPermission(perms, p) {
			return false, nil
		}
	}
	return true, nil
}

// checkPermission checks if the JSONB permissions map contains the given permission.
// Supports formats:
//   - {"users:read": true, "users:create": true}  (flat)
//   - {"users": {"read": true, "create": true}}    (nested module:action)
//   - {"*": true}                                    (wildcard = all permissions)
func checkPermission(perms model.JSONB, perm Permission) bool {
	if perms == nil {
		return false
	}

	// Check wildcard
	if val, ok := perms["*"]; ok {
		if b, ok := val.(bool); ok && b {
			return true
		}
	}

	permStr := string(perm)

	// Check flat format: "users:read": true
	if val, ok := perms[permStr]; ok {
		if b, ok := val.(bool); ok {
			return b
		}
	}

	// Check nested format: "users": {"read": true}
	// Split "users:read" into module="users", action="read"
	for i := 0; i < len(permStr); i++ {
		if permStr[i] == ':' {
			module := permStr[:i]
			action := permStr[i+1:]

			if modulePerms, ok := perms[module]; ok {
				switch v := modulePerms.(type) {
				case map[string]interface{}:
					if actionVal, ok := v[action]; ok {
						if b, ok := actionVal.(bool); ok {
							return b
						}
					}
					// Check module wildcard: {"users": {"*": true}}
					if wildcard, ok := v["*"]; ok {
						if b, ok := wildcard.(bool); ok && b {
							return true
						}
					}
				case bool:
					return v
				}
			}
			break
		}
	}

	return false
}
