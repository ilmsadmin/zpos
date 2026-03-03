package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
)

type purchaseOrderRepository struct {
	db *pgxpool.Pool
}

func NewPurchaseOrderRepository(db *pgxpool.Pool) repository.PurchaseOrderRepository {
	return &purchaseOrderRepository{db: db}
}

func (r *purchaseOrderRepository) Create(ctx context.Context, po *model.PurchaseOrder) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `INSERT INTO purchase_orders (id, store_id, supplier_id, user_id, order_number, status, total_amount, notes, expected_date, received_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err = tx.Exec(ctx, query,
		po.ID, po.StoreID, po.SupplierID, po.UserID, po.OrderNumber,
		po.Status, po.TotalAmount, po.Notes, po.ExpectedDate, po.ReceivedDate,
		po.CreatedAt, po.UpdatedAt,
	)
	if err != nil {
		return err
	}

	for _, item := range po.Items {
		itemQ := `INSERT INTO purchase_order_items (id, purchase_order_id, product_variant_id, quantity, received_qty, unit_price, total_price, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
		_, err = tx.Exec(ctx, itemQ,
			item.ID, po.ID, item.ProductVariantID, item.Quantity,
			item.ReceivedQty, item.UnitPrice, item.TotalPrice, time.Now(),
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *purchaseOrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.PurchaseOrder, error) {
	po := &model.PurchaseOrder{}
	query := `SELECT id, store_id, supplier_id, user_id, order_number, status, total_amount, notes, expected_date, received_date, created_at, updated_at
		FROM purchase_orders WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&po.ID, &po.StoreID, &po.SupplierID, &po.UserID, &po.OrderNumber,
		&po.Status, &po.TotalAmount, &po.Notes, &po.ExpectedDate, &po.ReceivedDate,
		&po.CreatedAt, &po.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("purchase order not found")
	}
	if err != nil {
		return nil, err
	}

	// Load items
	itemRows, err := r.db.Query(ctx, `SELECT id, purchase_order_id, product_variant_id, quantity, received_qty, unit_price, total_price, created_at
		FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at`, id)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var item model.PurchaseOrderItem
		if err := itemRows.Scan(
			&item.ID, &item.PurchaseOrderID, &item.ProductVariantID, &item.Quantity,
			&item.ReceivedQty, &item.UnitPrice, &item.TotalPrice, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		po.Items = append(po.Items, item)
	}

	return po, nil
}

func (r *purchaseOrderRepository) List(ctx context.Context, storeID uuid.UUID, page, limit int, status string) ([]model.PurchaseOrder, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("store_id = $%d", argIdx))
	args = append(args, storeID)
	argIdx++

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, status)
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM purchase_orders %s`, whereClause)
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := fmt.Sprintf(`SELECT id, store_id, supplier_id, user_id, order_number, status, total_amount, notes, expected_date, received_date, created_at, updated_at
		FROM purchase_orders %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []model.PurchaseOrder
	for rows.Next() {
		var po model.PurchaseOrder
		if err := rows.Scan(
			&po.ID, &po.StoreID, &po.SupplierID, &po.UserID, &po.OrderNumber,
			&po.Status, &po.TotalAmount, &po.Notes, &po.ExpectedDate, &po.ReceivedDate,
			&po.CreatedAt, &po.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		orders = append(orders, po)
	}
	return orders, total, nil
}

func (r *purchaseOrderRepository) Update(ctx context.Context, po *model.PurchaseOrder) error {
	query := `UPDATE purchase_orders SET status = $2, total_amount = $3, notes = $4, expected_date = $5, received_date = $6, updated_at = $7 WHERE id = $1`
	_, err := r.db.Exec(ctx, query,
		po.ID, po.Status, po.TotalAmount, po.Notes, po.ExpectedDate, po.ReceivedDate, time.Now(),
	)
	return err
}

func (r *purchaseOrderRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE purchase_orders SET status = $2, updated_at = NOW() WHERE id = $1`, id, status)
	return err
}
