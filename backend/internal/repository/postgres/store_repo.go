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

type storeRepository struct {
	db *pgxpool.Pool
}

func NewStoreRepository(db *pgxpool.Pool) repository.StoreRepository {
	return &storeRepository{db: db}
}

func (r *storeRepository) Create(ctx context.Context, store *model.Store) error {
	settingsJSON, _ := json.Marshal(store.Settings)
	query := `INSERT INTO stores (id, name, code, address, phone, email, logo_url, is_active, settings, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
	_, err := r.db.Exec(ctx, query,
		store.ID, store.Name, store.Code, store.Address, store.Phone, store.Email,
		store.LogoURL, store.IsActive, settingsJSON, store.CreatedAt, store.UpdatedAt,
	)
	return err
}

func (r *storeRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Store, error) {
	store := &model.Store{}
	var settingsJSON []byte
	query := `SELECT id, name, code, address, phone, email, logo_url, is_active, settings, created_at, updated_at, deleted_at
		FROM stores WHERE id = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&store.ID, &store.Name, &store.Code, &store.Address, &store.Phone, &store.Email,
		&store.LogoURL, &store.IsActive, &settingsJSON, &store.CreatedAt, &store.UpdatedAt, &store.DeletedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("store not found")
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(settingsJSON, &store.Settings)
	return store, nil
}

func (r *storeRepository) GetByCode(ctx context.Context, code string) (*model.Store, error) {
	store := &model.Store{}
	var settingsJSON []byte
	query := `SELECT id, name, code, address, phone, email, logo_url, is_active, settings, created_at, updated_at, deleted_at
		FROM stores WHERE code = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, code).Scan(
		&store.ID, &store.Name, &store.Code, &store.Address, &store.Phone, &store.Email,
		&store.LogoURL, &store.IsActive, &settingsJSON, &store.CreatedAt, &store.UpdatedAt, &store.DeletedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("store not found")
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(settingsJSON, &store.Settings)
	return store, nil
}

func (r *storeRepository) GetAll(ctx context.Context) ([]model.Store, error) {
	query := `SELECT id, name, code, address, phone, email, logo_url, is_active, settings, created_at, updated_at, deleted_at
		FROM stores WHERE deleted_at IS NULL ORDER BY name`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stores []model.Store
	for rows.Next() {
		var s model.Store
		var settingsJSON []byte
		if err := rows.Scan(
			&s.ID, &s.Name, &s.Code, &s.Address, &s.Phone, &s.Email,
			&s.LogoURL, &s.IsActive, &settingsJSON, &s.CreatedAt, &s.UpdatedAt, &s.DeletedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(settingsJSON, &s.Settings)
		stores = append(stores, s)
	}
	return stores, nil
}

func (r *storeRepository) Update(ctx context.Context, store *model.Store) error {
	settingsJSON, _ := json.Marshal(store.Settings)
	query := `UPDATE stores SET name = $2, address = $3, phone = $4, email = $5, logo_url = $6, is_active = $7, settings = $8, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query,
		store.ID, store.Name, store.Address, store.Phone, store.Email,
		store.LogoURL, store.IsActive, settingsJSON,
	)
	return err
}

func (r *storeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE stores SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
