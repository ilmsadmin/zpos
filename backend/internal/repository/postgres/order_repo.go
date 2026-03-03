package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
)

type orderRepository struct {
	db *pgxpool.Pool
}

func NewOrderRepository(db *pgxpool.Pool) repository.OrderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) Create(ctx context.Context, o *model.Order) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `INSERT INTO orders (id, store_id, customer_id, user_id, order_number, status, sub_total, discount_type, discount_value, discount_amount, tax_amount, total_amount, paid_amount, change_amount, notes, pos_session_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`
	_, err = tx.Exec(ctx, query,
		o.ID, o.StoreID, o.CustomerID, o.UserID, o.OrderNumber, o.Status,
		o.SubTotal, o.DiscountType, o.DiscountValue, o.DiscountAmount,
		o.TaxAmount, o.TotalAmount, o.PaidAmount, o.ChangeAmount,
		o.Notes, o.POSSessionID, o.CreatedAt, o.UpdatedAt,
	)
	if err != nil {
		return err
	}

	// Insert order items
	for _, item := range o.Items {
		itemQ := `INSERT INTO order_items (id, order_id, product_variant_id, product_name, variant_name, sku, quantity, unit_price, discount_type, discount_value, discount_amount, total_price, warranty_months, notes, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`
		_, err = tx.Exec(ctx, itemQ,
			item.ID, o.ID, item.ProductVariantID, item.ProductName, item.VariantName,
			item.SKU, item.Quantity, item.UnitPrice, item.DiscountType, item.DiscountValue,
			item.DiscountAmount, item.TotalPrice, item.WarrantyMonths, item.Notes, time.Now(),
		)
		if err != nil {
			return err
		}
	}

	// Insert payments
	for _, p := range o.Payments {
		payQ := `INSERT INTO payments (id, order_id, method, amount, status, transaction_id, notes, paid_at, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
		_, err = tx.Exec(ctx, payQ,
			p.ID, o.ID, p.Method, p.Amount, p.Status, p.TransactionID,
			p.Notes, p.PaidAt, time.Now(), time.Now(),
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *orderRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Order, error) {
	o := &model.Order{}
	query := `SELECT id, store_id, customer_id, user_id, order_number, status, sub_total, discount_type, discount_value, discount_amount, tax_amount, total_amount, paid_amount, change_amount, notes, pos_session_id, created_at, updated_at
		FROM orders WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.StoreID, &o.CustomerID, &o.UserID, &o.OrderNumber, &o.Status,
		&o.SubTotal, &o.DiscountType, &o.DiscountValue, &o.DiscountAmount,
		&o.TaxAmount, &o.TotalAmount, &o.PaidAmount, &o.ChangeAmount,
		&o.Notes, &o.POSSessionID, &o.CreatedAt, &o.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("order not found")
	}
	if err != nil {
		return nil, err
	}

	// Load items
	itemRows, err := r.db.Query(ctx, `SELECT id, order_id, product_variant_id, product_name, variant_name, sku, quantity, unit_price, discount_type, discount_value, discount_amount, total_price, warranty_months, notes, created_at
		FROM order_items WHERE order_id = $1 ORDER BY created_at`, id)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var item model.OrderItem
		if err := itemRows.Scan(
			&item.ID, &item.OrderID, &item.ProductVariantID, &item.ProductName, &item.VariantName,
			&item.SKU, &item.Quantity, &item.UnitPrice, &item.DiscountType, &item.DiscountValue,
			&item.DiscountAmount, &item.TotalPrice, &item.WarrantyMonths, &item.Notes, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		o.Items = append(o.Items, item)
	}

	// Load payments
	payRows, err := r.db.Query(ctx, `SELECT id, order_id, method, amount, status, transaction_id, notes, paid_at, created_at, updated_at
		FROM payments WHERE order_id = $1 ORDER BY created_at`, id)
	if err != nil {
		return nil, err
	}
	defer payRows.Close()

	for payRows.Next() {
		var p model.Payment
		if err := payRows.Scan(
			&p.ID, &p.OrderID, &p.Method, &p.Amount, &p.Status, &p.TransactionID,
			&p.Notes, &p.PaidAt, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		o.Payments = append(o.Payments, p)
	}

	return o, nil
}

func (r *orderRepository) GetByOrderNumber(ctx context.Context, orderNumber string) (*model.Order, error) {
	var id uuid.UUID
	query := `SELECT id FROM orders WHERE order_number = $1`
	err := r.db.QueryRow(ctx, query, orderNumber).Scan(&id)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("order not found")
	}
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *orderRepository) List(ctx context.Context, storeID uuid.UUID, params repository.OrderListParams) ([]model.Order, int64, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("store_id = $%d", argIdx))
	args = append(args, storeID)
	argIdx++

	if params.Search != "" {
		conditions = append(conditions, fmt.Sprintf("order_number ILIKE $%d", argIdx))
		args = append(args, "%"+params.Search+"%")
		argIdx++
	}

	if params.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, params.Status)
		argIdx++
	}

	if params.CustomerID != uuid.Nil {
		conditions = append(conditions, fmt.Sprintf("customer_id = $%d", argIdx))
		args = append(args, params.CustomerID)
		argIdx++
	}

	if params.UserID != uuid.Nil {
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", argIdx))
		args = append(args, params.UserID)
		argIdx++
	}

	if params.DateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIdx))
		args = append(args, params.DateFrom)
		argIdx++
	}

	if params.DateTo != "" {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIdx))
		args = append(args, params.DateTo+"T23:59:59Z")
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM orders %s`, whereClause)
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortBy := "created_at"
	sortOrder := "DESC"
	if params.SortBy != "" {
		allowed := map[string]bool{"created_at": true, "total_amount": true, "order_number": true, "status": true}
		if allowed[params.SortBy] {
			sortBy = params.SortBy
		}
	}
	if params.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := fmt.Sprintf(`SELECT id, store_id, customer_id, user_id, order_number, status, sub_total, discount_type, discount_value, discount_amount, tax_amount, total_amount, paid_amount, change_amount, notes, pos_session_id, created_at, updated_at
		FROM orders %s ORDER BY %s %s LIMIT $%d OFFSET $%d`,
		whereClause, sortBy, sortOrder, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []model.Order
	for rows.Next() {
		var o model.Order
		if err := rows.Scan(
			&o.ID, &o.StoreID, &o.CustomerID, &o.UserID, &o.OrderNumber, &o.Status,
			&o.SubTotal, &o.DiscountType, &o.DiscountValue, &o.DiscountAmount,
			&o.TaxAmount, &o.TotalAmount, &o.PaidAmount, &o.ChangeAmount,
			&o.Notes, &o.POSSessionID, &o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}
	return orders, total, nil
}

func (r *orderRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1`, id, status)
	return err
}

func (r *orderRepository) Update(ctx context.Context, o *model.Order) error {
	query := `UPDATE orders SET status = $2, paid_amount = $3, change_amount = $4, notes = $5, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, o.ID, o.Status, o.PaidAmount, o.ChangeAmount, o.Notes)
	return err
}

func (r *orderRepository) GetDailySales(ctx context.Context, storeID uuid.UUID, date string) (float64, int, error) {
	var totalAmount float64
	var totalOrders int
	query := `SELECT COALESCE(SUM(total_amount), 0), COUNT(*) FROM orders 
		WHERE store_id = $1 AND DATE(created_at) = $2 AND status IN ('completed', 'confirmed')`
	err := r.db.QueryRow(ctx, query, storeID, date).Scan(&totalAmount, &totalOrders)
	if err != nil {
		return 0, 0, err
	}
	return totalAmount, totalOrders, nil
}

func (r *orderRepository) GetCustomerPurchasedItems(ctx context.Context, storeID, customerID uuid.UUID) ([]dto.CustomerPurchasedItemResponse, error) {
	query := `SELECT
			oi.id AS order_item_id,
			o.id AS order_id,
			o.order_number,
			o.created_at AS order_date,
			oi.product_variant_id,
			oi.product_name,
			oi.variant_name,
			oi.sku,
			oi.quantity,
			oi.unit_price,
			oi.warranty_months,
			CASE WHEN w.id IS NOT NULL THEN true ELSE false END AS has_warranty
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		LEFT JOIN warranties w ON w.order_item_id = oi.id AND w.status != 'voided'
		WHERE o.store_id = $1 AND o.customer_id = $2 AND o.status IN ('completed', 'confirmed')
		ORDER BY o.created_at DESC`

	rows, err := r.db.Query(ctx, query, storeID, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []dto.CustomerPurchasedItemResponse
	for rows.Next() {
		var item dto.CustomerPurchasedItemResponse
		if err := rows.Scan(
			&item.OrderItemID, &item.OrderID, &item.OrderNumber, &item.OrderDate,
			&item.ProductVariantID, &item.ProductName, &item.VariantName, &item.SKU,
			&item.Quantity, &item.UnitPrice, &item.WarrantyMonths, &item.HasWarranty,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
