package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
)

type userRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) repository.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *model.User) error {
	query := `INSERT INTO users (id, store_id, role_id, email, password_hash, full_name, phone, avatar_url, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
	_, err := r.db.Exec(ctx, query,
		user.ID, user.StoreID, user.RoleID, user.Email, user.PasswordHash,
		user.FullName, user.Phone, user.AvatarURL, user.IsActive, user.CreatedAt, user.UpdatedAt,
	)
	return err
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	user := &model.User{}
	query := `SELECT id, store_id, role_id, email, password_hash, full_name, COALESCE(phone, ''), COALESCE(avatar_url, ''), is_active, last_login_at, created_at, updated_at, deleted_at
		FROM users WHERE id = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.StoreID, &user.RoleID, &user.Email, &user.PasswordHash,
		&user.FullName, &user.Phone, &user.AvatarURL, &user.IsActive, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	return user, err
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	user := &model.User{}
	query := `SELECT id, store_id, role_id, email, password_hash, full_name, COALESCE(phone, ''), COALESCE(avatar_url, ''), is_active, last_login_at, created_at, updated_at, deleted_at
		FROM users WHERE email = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.StoreID, &user.RoleID, &user.Email, &user.PasswordHash,
		&user.FullName, &user.Phone, &user.AvatarURL, &user.IsActive, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	return user, err
}

func (r *userRepository) GetByStoreID(ctx context.Context, storeID uuid.UUID, page, limit int) ([]model.User, int64, error) {
	var total int64
	countQuery := `SELECT COUNT(*) FROM users WHERE store_id = $1 AND deleted_at IS NULL`
	if err := r.db.QueryRow(ctx, countQuery, storeID).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := `SELECT id, store_id, role_id, email, password_hash, full_name, COALESCE(phone, ''), COALESCE(avatar_url, ''), is_active, last_login_at, created_at, updated_at, deleted_at
		FROM users WHERE store_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, query, storeID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := rows.Scan(
			&u.ID, &u.StoreID, &u.RoleID, &u.Email, &u.PasswordHash,
			&u.FullName, &u.Phone, &u.AvatarURL, &u.IsActive, &u.LastLoginAt,
			&u.CreatedAt, &u.UpdatedAt, &u.DeletedAt,
		); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	return users, total, nil
}

func (r *userRepository) Update(ctx context.Context, user *model.User) error {
	query := `UPDATE users SET role_id = $2, email = $3, password_hash = $4, full_name = $5, phone = $6, avatar_url = $7, is_active = $8, updated_at = $9
		WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query,
		user.ID, user.RoleID, user.Email, user.PasswordHash, user.FullName,
		user.Phone, user.AvatarURL, user.IsActive, time.Now(),
	)
	return err
}

func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE users SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, id, time.Now())
	return err
}

func (r *userRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE users SET last_login_at = $2 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id, time.Now())
	return err
}
