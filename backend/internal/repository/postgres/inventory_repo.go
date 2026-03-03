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

type inventoryRepository struct {
	db *pgxpool.Pool
}

func NewInventoryRepository(db *pgxpool.Pool) repository.InventoryRepository {
	return &inventoryRepository{db: db}
}

func (r *inventoryRepository) Create(ctx context.Context, inv *model.Inventory) error {
	query := `INSERT INTO inventory (id, store_id, product_variant_id, quantity, reserved_qty, min_stock_level, max_stock_level, location, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err := r.db.Exec(ctx, query,
		inv.ID, inv.StoreID, inv.ProductVariantID, inv.Quantity, inv.ReservedQty,
		inv.MinStockLevel, inv.MaxStockLevel, inv.Location, inv.UpdatedAt,
	)
	return err
}

func (r *inventoryRepository) GetByVariantID(ctx context.Context, storeID, variantID uuid.UUID) (*model.Inventory, error) {
	inv := &model.Inventory{}
	query := `SELECT id, store_id, product_variant_id, quantity, reserved_qty, min_stock_level, max_stock_level, location, updated_at
		FROM inventory WHERE store_id = $1 AND product_variant_id = $2`
	err := r.db.QueryRow(ctx, query, storeID, variantID).Scan(
		&inv.ID, &inv.StoreID, &inv.ProductVariantID, &inv.Quantity, &inv.ReservedQty,
		&inv.MinStockLevel, &inv.MaxStockLevel, &inv.Location, &inv.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("inventory not found")
	}
	return inv, err
}

func (r *inventoryRepository) GetLowStock(ctx context.Context, storeID uuid.UUID, page, limit int) ([]model.Inventory, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	var total int64
	countQ := `SELECT COUNT(*) FROM inventory WHERE store_id = $1 AND (quantity - reserved_qty) <= min_stock_level`
	if err := r.db.QueryRow(ctx, countQ, storeID).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := `SELECT id, store_id, product_variant_id, quantity, reserved_qty, min_stock_level, max_stock_level, location, updated_at
		FROM inventory WHERE store_id = $1 AND (quantity - reserved_qty) <= min_stock_level
		ORDER BY (quantity - reserved_qty - min_stock_level) ASC LIMIT $2 OFFSET $3`
	rows, err := r.db.Query(ctx, query, storeID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []model.Inventory
	for rows.Next() {
		var inv model.Inventory
		if err := rows.Scan(
			&inv.ID, &inv.StoreID, &inv.ProductVariantID, &inv.Quantity, &inv.ReservedQty,
			&inv.MinStockLevel, &inv.MaxStockLevel, &inv.Location, &inv.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, inv)
	}
	return items, total, nil
}

func (r *inventoryRepository) UpdateQuantity(ctx context.Context, id uuid.UUID, quantity int) error {
	_, err := r.db.Exec(ctx, `UPDATE inventory SET quantity = $2, updated_at = NOW() WHERE id = $1`, id, quantity)
	return err
}

func (r *inventoryRepository) ReserveStock(ctx context.Context, id uuid.UUID, quantity int) error {
	_, err := r.db.Exec(ctx, `UPDATE inventory SET reserved_qty = reserved_qty + $2, updated_at = NOW() WHERE id = $1`, id, quantity)
	return err
}

func (r *inventoryRepository) ReleaseStock(ctx context.Context, id uuid.UUID, quantity int) error {
	_, err := r.db.Exec(ctx, `UPDATE inventory SET reserved_qty = GREATEST(reserved_qty - $2, 0), updated_at = NOW() WHERE id = $1`, id, quantity)
	return err
}

func (r *inventoryRepository) CreateMovement(ctx context.Context, m *model.InventoryMovement) error {
	query := `INSERT INTO inventory_movements (id, store_id, product_variant_id, type, quantity, previous_qty, new_qty, reference_type, reference_id, notes, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err := r.db.Exec(ctx, query,
		m.ID, m.StoreID, m.ProductVariantID, m.Type, m.Quantity,
		m.PreviousQty, m.NewQty, m.ReferenceType, m.ReferenceID,
		m.Notes, m.CreatedBy, time.Now(),
	)
	return err
}

func (r *inventoryRepository) GetMovements(ctx context.Context, storeID, variantID uuid.UUID, page, limit int) ([]model.InventoryMovement, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	var total int64
	countQ := `SELECT COUNT(*) FROM inventory_movements WHERE store_id = $1 AND product_variant_id = $2`
	if err := r.db.QueryRow(ctx, countQ, storeID, variantID).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := `SELECT id, store_id, product_variant_id, type, quantity, previous_qty, new_qty, reference_type, reference_id, notes, created_by, created_at
		FROM inventory_movements WHERE store_id = $1 AND product_variant_id = $2
		ORDER BY created_at DESC LIMIT $3 OFFSET $4`
	rows, err := r.db.Query(ctx, query, storeID, variantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var movements []model.InventoryMovement
	for rows.Next() {
		var m model.InventoryMovement
		if err := rows.Scan(
			&m.ID, &m.StoreID, &m.ProductVariantID, &m.Type, &m.Quantity,
			&m.PreviousQty, &m.NewQty, &m.ReferenceType, &m.ReferenceID,
			&m.Notes, &m.CreatedBy, &m.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		movements = append(movements, m)
	}
	return movements, total, nil
}
