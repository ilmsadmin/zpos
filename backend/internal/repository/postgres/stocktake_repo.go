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

type stocktakeRepository struct {
	db *pgxpool.Pool
}

func NewStocktakeRepository(db *pgxpool.Pool) repository.StocktakeRepository {
	return &stocktakeRepository{db: db}
}

func (r *stocktakeRepository) Create(ctx context.Context, s *model.Stocktake) error {
	query := `INSERT INTO stocktakes (id, store_id, user_id, code, status, notes, total_items, matched_items, mismatch_items, started_at, completed_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
	_, err := r.db.Exec(ctx, query,
		s.ID, s.StoreID, s.UserID, s.Code, s.Status, s.Notes,
		s.TotalItems, s.MatchedItems, s.MismatchItems,
		s.StartedAt, s.CompletedAt, s.CreatedAt, s.UpdatedAt,
	)
	return err
}

func (r *stocktakeRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Stocktake, error) {
	s := &model.Stocktake{}
	query := `SELECT id, store_id, user_id, code, status, notes, total_items, matched_items, mismatch_items, started_at, completed_at, created_at, updated_at
		FROM stocktakes WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.StoreID, &s.UserID, &s.Code, &s.Status, &s.Notes,
		&s.TotalItems, &s.MatchedItems, &s.MismatchItems,
		&s.StartedAt, &s.CompletedAt, &s.CreatedAt, &s.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("stocktake not found")
	}
	return s, err
}

func (r *stocktakeRepository) List(ctx context.Context, storeID uuid.UUID, page, limit int) ([]model.Stocktake, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM stocktakes WHERE store_id = $1`, storeID).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := `SELECT id, store_id, user_id, code, status, notes, total_items, matched_items, mismatch_items, started_at, completed_at, created_at, updated_at
		FROM stocktakes WHERE store_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	rows, err := r.db.Query(ctx, query, storeID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var stocktakes []model.Stocktake
	for rows.Next() {
		var s model.Stocktake
		if err := rows.Scan(
			&s.ID, &s.StoreID, &s.UserID, &s.Code, &s.Status, &s.Notes,
			&s.TotalItems, &s.MatchedItems, &s.MismatchItems,
			&s.StartedAt, &s.CompletedAt, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		stocktakes = append(stocktakes, s)
	}
	return stocktakes, total, nil
}

func (r *stocktakeRepository) Update(ctx context.Context, s *model.Stocktake) error {
	query := `UPDATE stocktakes SET status = $2, notes = $3, total_items = $4, matched_items = $5, mismatch_items = $6, started_at = $7, completed_at = $8, updated_at = $9
		WHERE id = $1`
	_, err := r.db.Exec(ctx, query,
		s.ID, s.Status, s.Notes, s.TotalItems, s.MatchedItems, s.MismatchItems,
		s.StartedAt, s.CompletedAt, time.Now(),
	)
	return err
}

func (r *stocktakeRepository) AddItem(ctx context.Context, item *model.StocktakeItem) error {
	query := `INSERT INTO stocktake_items (id, stocktake_id, product_variant_id, system_qty, counted_qty, difference, notes, counted_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
	_, err := r.db.Exec(ctx, query,
		item.ID, item.StocktakeID, item.ProductVariantID, item.SystemQty,
		item.CountedQty, item.Difference, item.Notes, item.CountedAt,
	)
	return err
}

func (r *stocktakeRepository) GetItems(ctx context.Context, stocktakeID uuid.UUID) ([]model.StocktakeItem, error) {
	query := `SELECT id, stocktake_id, product_variant_id, system_qty, counted_qty, difference, notes, counted_at
		FROM stocktake_items WHERE stocktake_id = $1 ORDER BY counted_at`
	rows, err := r.db.Query(ctx, query, stocktakeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.StocktakeItem
	for rows.Next() {
		var item model.StocktakeItem
		if err := rows.Scan(
			&item.ID, &item.StocktakeID, &item.ProductVariantID, &item.SystemQty,
			&item.CountedQty, &item.Difference, &item.Notes, &item.CountedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *stocktakeRepository) UpdateItem(ctx context.Context, item *model.StocktakeItem) error {
	query := `UPDATE stocktake_items SET counted_qty = $2, difference = $3, notes = $4, counted_at = $5 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, item.ID, item.CountedQty, item.Difference, item.Notes, item.CountedAt)
	return err
}
