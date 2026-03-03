package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
)

type roleRepository struct {
	db *pgxpool.Pool
}

func NewRoleRepository(db *pgxpool.Pool) repository.RoleRepository {
	return &roleRepository{db: db}
}

func (r *roleRepository) Create(ctx context.Context, role *model.Role) error {
	permJSON, _ := json.Marshal(role.Permissions)
	query := `INSERT INTO roles (id, store_id, name, display_name, description, permissions, is_system, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err := r.db.Exec(ctx, query,
		role.ID, role.StoreID, role.Name, role.DisplayName, role.Description,
		permJSON, role.IsSystem, role.CreatedAt, role.UpdatedAt,
	)
	return err
}

func (r *roleRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Role, error) {
	role := &model.Role{}
	var permJSON []byte
	query := `SELECT id, store_id, name, display_name, description, permissions, is_system, created_at, updated_at
		FROM roles WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&role.ID, &role.StoreID, &role.Name, &role.DisplayName, &role.Description,
		&permJSON, &role.IsSystem, &role.CreatedAt, &role.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("role not found")
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(permJSON, &role.Permissions)
	return role, nil
}

func (r *roleRepository) GetByName(ctx context.Context, name string) (*model.Role, error) {
	role := &model.Role{}
	var permJSON []byte
	query := `SELECT id, store_id, name, display_name, description, permissions, is_system, created_at, updated_at
		FROM roles WHERE name = $1`
	err := r.db.QueryRow(ctx, query, name).Scan(
		&role.ID, &role.StoreID, &role.Name, &role.DisplayName, &role.Description,
		&permJSON, &role.IsSystem, &role.CreatedAt, &role.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("role not found")
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(permJSON, &role.Permissions)
	return role, nil
}

func (r *roleRepository) GetByStoreID(ctx context.Context, storeID uuid.UUID) ([]model.Role, error) {
	query := `SELECT id, store_id, name, display_name, description, permissions, is_system, created_at, updated_at
		FROM roles WHERE store_id = $1 AND is_system = false ORDER BY name`
	rows, err := r.db.Query(ctx, query, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []model.Role
	for rows.Next() {
		var role model.Role
		var permJSON []byte
		if err := rows.Scan(
			&role.ID, &role.StoreID, &role.Name, &role.DisplayName, &role.Description,
			&permJSON, &role.IsSystem, &role.CreatedAt, &role.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(permJSON, &role.Permissions)
		roles = append(roles, role)
	}
	return roles, nil
}

func (r *roleRepository) GetSystemRoles(ctx context.Context) ([]model.Role, error) {
	query := `SELECT DISTINCT ON (name) id, store_id, name, display_name, description, permissions, is_system, created_at, updated_at
		FROM roles WHERE is_system = true ORDER BY name, created_at`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []model.Role
	for rows.Next() {
		var role model.Role
		var permJSON []byte
		if err := rows.Scan(
			&role.ID, &role.StoreID, &role.Name, &role.DisplayName, &role.Description,
			&permJSON, &role.IsSystem, &role.CreatedAt, &role.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(permJSON, &role.Permissions)
		roles = append(roles, role)
	}
	return roles, nil
}

func (r *roleRepository) Update(ctx context.Context, role *model.Role) error {
	permJSON, _ := json.Marshal(role.Permissions)
	query := `UPDATE roles SET display_name = $2, description = $3, permissions = $4, updated_at = NOW()
		WHERE id = $1`
	_, err := r.db.Exec(ctx, query, role.ID, role.DisplayName, role.Description, permJSON)
	return err
}

func (r *roleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM roles WHERE id = $1 AND is_system = false`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
