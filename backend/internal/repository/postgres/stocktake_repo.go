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

func (r *stocktakeRepository) List(ctx context.Context, storeID uuid.UUID, page, limit int, status, search string) ([]model.Stocktake, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	// Build dynamic WHERE clause
	where := `WHERE store_id = $1`
	args := []interface{}{storeID}
	argIdx := 2

	if status != "" {
		where += fmt.Sprintf(` AND status = $%d`, argIdx)
		args = append(args, status)
		argIdx++
	}
	if search != "" {
		where += fmt.Sprintf(` AND (code ILIKE $%d OR notes ILIKE $%d)`, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM stocktakes %s`, where)
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := fmt.Sprintf(`SELECT id, store_id, user_id, code, status, notes, total_items, matched_items, mismatch_items, started_at, completed_at, created_at, updated_at
		FROM stocktakes %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
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

func (r *stocktakeRepository) GetItemsWithProductInfo(ctx context.Context, stocktakeID uuid.UUID) ([]repository.StocktakeItemWithProduct, error) {
	query := `SELECT si.id, si.stocktake_id, si.product_variant_id, si.system_qty, si.counted_qty, si.difference, si.notes, si.counted_at,
		COALESCE(p.name, '') AS product_name, COALESCE(pv.name, '') AS variant_name, COALESCE(pv.sku, '') AS sku, COALESCE(pv.barcode, '') AS barcode
		FROM stocktake_items si
		LEFT JOIN product_variants pv ON pv.id = si.product_variant_id
		LEFT JOIN products p ON p.id = pv.product_id
		WHERE si.stocktake_id = $1
		ORDER BY si.counted_at DESC`
	rows, err := r.db.Query(ctx, query, stocktakeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []repository.StocktakeItemWithProduct
	for rows.Next() {
		var item repository.StocktakeItemWithProduct
		if err := rows.Scan(
			&item.ID, &item.StocktakeID, &item.ProductVariantID, &item.SystemQty,
			&item.CountedQty, &item.Difference, &item.Notes, &item.CountedAt,
			&item.ProductName, &item.VariantName, &item.SKU, &item.Barcode,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *stocktakeRepository) GetItemByVariant(ctx context.Context, stocktakeID, variantID uuid.UUID) (*model.StocktakeItem, error) {
	item := &model.StocktakeItem{}
	query := `SELECT id, stocktake_id, product_variant_id, system_qty, counted_qty, difference, notes, counted_at
		FROM stocktake_items WHERE stocktake_id = $1 AND product_variant_id = $2`
	err := r.db.QueryRow(ctx, query, stocktakeID, variantID).Scan(
		&item.ID, &item.StocktakeID, &item.ProductVariantID, &item.SystemQty,
		&item.CountedQty, &item.Difference, &item.Notes, &item.CountedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("stocktake item not found")
	}
	return item, err
}

func (r *stocktakeRepository) UpdateItem(ctx context.Context, item *model.StocktakeItem) error {
	query := `UPDATE stocktake_items SET counted_qty = $2, difference = $3, notes = $4, counted_at = $5 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, item.ID, item.CountedQty, item.Difference, item.Notes, item.CountedAt)
	return err
}

func (r *stocktakeRepository) DeleteItem(ctx context.Context, itemID uuid.UUID) error {
	query := `DELETE FROM stocktake_items WHERE id = $1`
	_, err := r.db.Exec(ctx, query, itemID)
	return err
}
