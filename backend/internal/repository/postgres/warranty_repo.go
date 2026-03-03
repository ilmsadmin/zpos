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

type warrantyRepository struct {
	db *pgxpool.Pool
}

func NewWarrantyRepository(db *pgxpool.Pool) repository.WarrantyRepository {
	return &warrantyRepository{db: db}
}

func (r *warrantyRepository) Create(ctx context.Context, w *model.Warranty) error {
	query := `INSERT INTO warranties (id, store_id, order_item_id, customer_id, product_variant_id, warranty_code, serial_number, start_date, end_date, warranty_months, status, terms, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`
	_, err := r.db.Exec(ctx, query,
		w.ID, w.StoreID, w.OrderItemID, w.CustomerID, w.ProductVariantID,
		w.WarrantyCode, w.SerialNumber, w.StartDate, w.EndDate, w.WarrantyMonths,
		w.Status, w.Terms, w.Notes, w.CreatedAt, w.UpdatedAt,
	)
	return err
}

func (r *warrantyRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Warranty, error) {
	w := &model.Warranty{}
	query := `SELECT id, store_id, order_item_id, customer_id, product_variant_id, warranty_code, serial_number, start_date, end_date, warranty_months, status, terms, notes, created_at, updated_at
		FROM warranties WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&w.ID, &w.StoreID, &w.OrderItemID, &w.CustomerID, &w.ProductVariantID,
		&w.WarrantyCode, &w.SerialNumber, &w.StartDate, &w.EndDate, &w.WarrantyMonths,
		&w.Status, &w.Terms, &w.Notes, &w.CreatedAt, &w.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("warranty not found")
	}
	return w, err
}

func (r *warrantyRepository) GetByCode(ctx context.Context, code string) (*model.Warranty, error) {
	w := &model.Warranty{}
	query := `SELECT id, store_id, order_item_id, customer_id, product_variant_id, warranty_code, serial_number, start_date, end_date, warranty_months, status, terms, notes, created_at, updated_at
		FROM warranties WHERE warranty_code = $1`
	err := r.db.QueryRow(ctx, query, code).Scan(
		&w.ID, &w.StoreID, &w.OrderItemID, &w.CustomerID, &w.ProductVariantID,
		&w.WarrantyCode, &w.SerialNumber, &w.StartDate, &w.EndDate, &w.WarrantyMonths,
		&w.Status, &w.Terms, &w.Notes, &w.CreatedAt, &w.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("warranty not found")
	}
	return w, err
}

func (r *warrantyRepository) GetBySerialNumber(ctx context.Context, serial string) ([]model.Warranty, error) {
	query := `SELECT id, store_id, order_item_id, customer_id, product_variant_id, warranty_code, serial_number, start_date, end_date, warranty_months, status, terms, notes, created_at, updated_at
		FROM warranties WHERE serial_number ILIKE $1 ORDER BY created_at DESC`
	return r.scanWarranties(ctx, query, "%"+serial+"%")
}

func (r *warrantyRepository) GetByCustomerPhone(ctx context.Context, phone string) ([]model.Warranty, error) {
	query := `SELECT w.id, w.store_id, w.order_item_id, w.customer_id, w.product_variant_id, w.warranty_code, w.serial_number, w.start_date, w.end_date, w.warranty_months, w.status, w.terms, w.notes, w.created_at, w.updated_at
		FROM warranties w JOIN customers c ON w.customer_id = c.id
		WHERE c.phone ILIKE $1 ORDER BY w.created_at DESC`
	return r.scanWarranties(ctx, query, "%"+phone+"%")
}

func (r *warrantyRepository) GetByOrderNumber(ctx context.Context, orderNumber string) ([]model.Warranty, error) {
	query := `SELECT w.id, w.store_id, w.order_item_id, w.customer_id, w.product_variant_id, w.warranty_code, w.serial_number, w.start_date, w.end_date, w.warranty_months, w.status, w.terms, w.notes, w.created_at, w.updated_at
		FROM warranties w JOIN order_items oi ON w.order_item_id = oi.id JOIN orders o ON oi.order_id = o.id
		WHERE o.order_number ILIKE $1 ORDER BY w.created_at DESC`
	return r.scanWarranties(ctx, query, "%"+orderNumber+"%")
}

func (r *warrantyRepository) scanWarranties(ctx context.Context, query string, args ...interface{}) ([]model.Warranty, error) {
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var warranties []model.Warranty
	for rows.Next() {
		var w model.Warranty
		if err := rows.Scan(
			&w.ID, &w.StoreID, &w.OrderItemID, &w.CustomerID, &w.ProductVariantID,
			&w.WarrantyCode, &w.SerialNumber, &w.StartDate, &w.EndDate, &w.WarrantyMonths,
			&w.Status, &w.Terms, &w.Notes, &w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, err
		}
		warranties = append(warranties, w)
	}
	return warranties, nil
}

func (r *warrantyRepository) GetExpiring(ctx context.Context, storeID uuid.UUID, days int, page, limit int) ([]model.Warranty, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	countQ := `SELECT COUNT(*) FROM warranties WHERE store_id = $1 AND status = 'active' AND end_date BETWEEN NOW() AND NOW() + $2::interval`
	interval := fmt.Sprintf("%d days", days)
	if err := r.db.QueryRow(ctx, countQ, storeID, interval).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `SELECT id, store_id, order_item_id, customer_id, product_variant_id, warranty_code, serial_number, start_date, end_date, warranty_months, status, terms, notes, created_at, updated_at
		FROM warranties WHERE store_id = $1 AND status = 'active' AND end_date BETWEEN NOW() AND NOW() + $2::interval
		ORDER BY end_date ASC LIMIT $3 OFFSET $4`
	rows, err := r.db.Query(ctx, query, storeID, interval, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var warranties []model.Warranty
	for rows.Next() {
		var w model.Warranty
		if err := rows.Scan(
			&w.ID, &w.StoreID, &w.OrderItemID, &w.CustomerID, &w.ProductVariantID,
			&w.WarrantyCode, &w.SerialNumber, &w.StartDate, &w.EndDate, &w.WarrantyMonths,
			&w.Status, &w.Terms, &w.Notes, &w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		warranties = append(warranties, w)
	}
	return warranties, total, nil
}

func (r *warrantyRepository) GetCustomerByID(ctx context.Context, id uuid.UUID) (*model.Customer, error) {
	c := &model.Customer{}
	query := `SELECT id, store_id, full_name, phone, email, address, date_of_birth, gender, notes, total_spent, order_count, points, tags, is_active, created_at, updated_at
		FROM customers WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.StoreID, &c.FullName, &c.Phone, &c.Email, &c.Address,
		&c.DateOfBirth, &c.Gender, &c.Notes, &c.TotalSpent, &c.OrderCount,
		&c.Points, &c.Tags, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *warrantyRepository) GetVariantByID(ctx context.Context, id uuid.UUID) (*model.ProductVariant, error) {
	v := &model.ProductVariant{}
	query := `SELECT id, product_id, sku, COALESCE(barcode, ''), COALESCE(name, ''), COALESCE(cost_price, 0), COALESCE(selling_price, 0), compare_at_price, weight, attributes, images, COALESCE(is_active, true), created_at, updated_at
		FROM product_variants WHERE id = $1`
	var attrJSON []byte
	var images []string
	err := r.db.QueryRow(ctx, query, id).Scan(
		&v.ID, &v.ProductID, &v.SKU, &v.Barcode, &v.Name, &v.CostPrice,
		&v.SellingPrice, &v.CompareAtPrice, &v.Weight, &attrJSON, &images,
		&v.IsActive, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if images != nil {
		v.Images = images
	}
	return v, nil
}

func (r *warrantyRepository) GetClaimByID(ctx context.Context, id uuid.UUID) (*model.WarrantyClaim, error) {
	c := &model.WarrantyClaim{}
	query := `SELECT id, warranty_id, store_id, claim_number, issue, description, status, resolution, technician_notes, received_date, completed_date, returned_date, images, created_by, created_at, updated_at
		FROM warranty_claims WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.WarrantyID, &c.StoreID, &c.ClaimNumber, &c.Issue, &c.Description,
		&c.Status, &c.Resolution, &c.TechnicianNotes, &c.ReceivedDate, &c.CompletedDate,
		&c.ReturnedDate, &c.Images, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("warranty claim not found")
	}
	return c, err
}

func (r *warrantyRepository) CountActiveClaimsByStoreID(ctx context.Context, storeID uuid.UUID) (int64, error) {
	query := `SELECT COUNT(*) FROM warranty_claims WHERE store_id = $1 AND status IN ('pending', 'received', 'processing')`
	var count int64
	err := r.db.QueryRow(ctx, query, storeID).Scan(&count)
	return count, err
}

func (r *warrantyRepository) List(ctx context.Context, storeID uuid.UUID, params repository.WarrantyListParams) ([]model.Warranty, int64, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("store_id = $%d", argIdx))
	args = append(args, storeID)
	argIdx++

	if params.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(warranty_code ILIKE $%d OR serial_number ILIKE $%d)", argIdx, argIdx))
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

	if params.DateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("start_date >= $%d", argIdx))
		args = append(args, params.DateFrom)
		argIdx++
	}

	if params.DateTo != "" {
		conditions = append(conditions, fmt.Sprintf("end_date <= $%d", argIdx))
		args = append(args, params.DateTo)
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM warranties %s`, whereClause)
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
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

	query := fmt.Sprintf(`SELECT id, store_id, order_item_id, customer_id, product_variant_id, warranty_code, serial_number, start_date, end_date, warranty_months, status, terms, notes, created_at, updated_at
		FROM warranties %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var warranties []model.Warranty
	for rows.Next() {
		var w model.Warranty
		if err := rows.Scan(
			&w.ID, &w.StoreID, &w.OrderItemID, &w.CustomerID, &w.ProductVariantID,
			&w.WarrantyCode, &w.SerialNumber, &w.StartDate, &w.EndDate, &w.WarrantyMonths,
			&w.Status, &w.Terms, &w.Notes, &w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		warranties = append(warranties, w)
	}
	return warranties, total, nil
}

func (r *warrantyRepository) Update(ctx context.Context, w *model.Warranty) error {
	query := `UPDATE warranties SET status = $2, terms = $3, notes = $4, updated_at = $5 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, w.ID, w.Status, w.Terms, w.Notes, time.Now())
	return err
}

func (r *warrantyRepository) CreateClaim(ctx context.Context, c *model.WarrantyClaim) error {
	query := `INSERT INTO warranty_claims (id, warranty_id, store_id, claim_number, issue, description, status, resolution, technician_notes, received_date, completed_date, returned_date, images, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`
	_, err := r.db.Exec(ctx, query,
		c.ID, c.WarrantyID, c.StoreID, c.ClaimNumber, c.Issue, c.Description,
		c.Status, c.Resolution, c.TechnicianNotes, c.ReceivedDate, c.CompletedDate,
		c.ReturnedDate, c.Images, c.CreatedBy, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *warrantyRepository) GetClaimsByWarrantyID(ctx context.Context, warrantyID uuid.UUID) ([]model.WarrantyClaim, error) {
	query := `SELECT id, warranty_id, store_id, claim_number, issue, description, status, resolution, technician_notes, received_date, completed_date, returned_date, images, created_by, created_at, updated_at
		FROM warranty_claims WHERE warranty_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(ctx, query, warrantyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var claims []model.WarrantyClaim
	for rows.Next() {
		var c model.WarrantyClaim
		if err := rows.Scan(
			&c.ID, &c.WarrantyID, &c.StoreID, &c.ClaimNumber, &c.Issue, &c.Description,
			&c.Status, &c.Resolution, &c.TechnicianNotes, &c.ReceivedDate, &c.CompletedDate,
			&c.ReturnedDate, &c.Images, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		claims = append(claims, c)
	}
	return claims, nil
}

func (r *warrantyRepository) UpdateClaim(ctx context.Context, c *model.WarrantyClaim) error {
	query := `UPDATE warranty_claims SET status = $2, resolution = $3, technician_notes = $4, received_date = $5, completed_date = $6, returned_date = $7, images = $8, updated_at = NOW()
		WHERE id = $1`
	_, err := r.db.Exec(ctx, query,
		c.ID, c.Status, c.Resolution, c.TechnicianNotes, c.ReceivedDate,
		c.CompletedDate, c.ReturnedDate, c.Images,
	)
	return err
}
