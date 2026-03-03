package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
)

type productRepository struct {
	db *pgxpool.Pool
}

func NewProductRepository(db *pgxpool.Pool) repository.ProductRepository {
	return &productRepository{db: db}
}

func (r *productRepository) Create(ctx context.Context, product *model.Product) error {
	if product.Slug == "" {
		product.Slug = generateSlug(product.Name)
	}
	query := `INSERT INTO products (id, store_id, category_id, name, slug, description, brand, unit, tags, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err := r.db.Exec(ctx, query,
		product.ID, product.StoreID, product.CategoryID, product.Name, product.Slug,
		product.Description, product.Brand, product.Unit, product.Tags,
		product.IsActive, product.CreatedAt, product.UpdatedAt,
	)
	return err
}

func (r *productRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Product, error) {
	p := &model.Product{}
	query := `SELECT id, store_id, category_id, name, slug, description, brand, unit, tags, is_active, created_at, updated_at, deleted_at
		FROM products WHERE id = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.StoreID, &p.CategoryID, &p.Name, &p.Slug,
		&p.Description, &p.Brand, &p.Unit, &p.Tags, &p.IsActive,
		&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("product not found")
	}
	return p, err
}

func (r *productRepository) GetBySlug(ctx context.Context, storeID uuid.UUID, slug string) (*model.Product, error) {
	p := &model.Product{}
	query := `SELECT id, store_id, category_id, name, slug, description, brand, unit, tags, is_active, created_at, updated_at, deleted_at
		FROM products WHERE store_id = $1 AND slug = $2 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, storeID, slug).Scan(
		&p.ID, &p.StoreID, &p.CategoryID, &p.Name, &p.Slug,
		&p.Description, &p.Brand, &p.Unit, &p.Tags, &p.IsActive,
		&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("product not found")
	}
	return p, err
}

func (r *productRepository) List(ctx context.Context, storeID uuid.UUID, params repository.ProductListParams) ([]model.Product, int64, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("p.store_id = $%d", argIdx))
	args = append(args, storeID)
	argIdx++

	conditions = append(conditions, "p.deleted_at IS NULL")

	if params.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(p.name ILIKE $%d OR p.brand ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+params.Search+"%")
		argIdx++
	}

	if params.CategoryID != uuid.Nil {
		conditions = append(conditions, fmt.Sprintf("p.category_id = $%d", argIdx))
		args = append(args, params.CategoryID)
		argIdx++
	}

	if len(params.CategoryIDs) > 0 {
		placeholders := make([]string, len(params.CategoryIDs))
		for i, cid := range params.CategoryIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIdx)
			args = append(args, cid)
			argIdx++
		}
		conditions = append(conditions, fmt.Sprintf("p.category_id IN (%s)", strings.Join(placeholders, ",")))
	}

	if params.Brand != "" {
		conditions = append(conditions, fmt.Sprintf("p.brand = $%d", argIdx))
		args = append(args, params.Brand)
		argIdx++
	}

	if params.IsActive != nil {
		conditions = append(conditions, fmt.Sprintf("p.is_active = $%d", argIdx))
		args = append(args, *params.IsActive)
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Count
	var total int64
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM products p %s`, whereClause)
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Sort
	sortBy := "p.created_at"
	sortOrder := "DESC"
	if params.SortBy != "" {
		allowed := map[string]bool{"name": true, "created_at": true, "updated_at": true, "brand": true}
		if allowed[params.SortBy] {
			sortBy = "p." + params.SortBy
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

	query := fmt.Sprintf(`SELECT p.id, p.store_id, p.category_id, p.name, p.slug, p.description, p.brand, p.unit, p.tags, p.is_active, p.created_at, p.updated_at, p.deleted_at
		FROM products p %s ORDER BY %s %s LIMIT $%d OFFSET $%d`,
		whereClause, sortBy, sortOrder, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var products []model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(
			&p.ID, &p.StoreID, &p.CategoryID, &p.Name, &p.Slug,
			&p.Description, &p.Brand, &p.Unit, &p.Tags, &p.IsActive,
			&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, 0, err
		}
		products = append(products, p)
	}
	return products, total, nil
}

func (r *productRepository) Update(ctx context.Context, product *model.Product) error {
	query := `UPDATE products SET category_id = $2, name = $3, slug = $4, description = $5, brand = $6, unit = $7, tags = $8, is_active = $9, updated_at = $10
		WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query,
		product.ID, product.CategoryID, product.Name, product.Slug,
		product.Description, product.Brand, product.Unit, product.Tags,
		product.IsActive, time.Now(),
	)
	return err
}

func (r *productRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE products SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *productRepository) Search(ctx context.Context, storeID uuid.UUID, queryStr string, limit int) ([]model.Product, error) {
	query := `SELECT id, store_id, category_id, name, slug, description, brand, unit, tags, is_active, created_at, updated_at, deleted_at
		FROM products WHERE store_id = $1 AND deleted_at IS NULL AND (name ILIKE $2 OR brand ILIKE $2)
		ORDER BY name LIMIT $3`
	rows, err := r.db.Query(ctx, query, storeID, "%"+queryStr+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(
			&p.ID, &p.StoreID, &p.CategoryID, &p.Name, &p.Slug,
			&p.Description, &p.Brand, &p.Unit, &p.Tags, &p.IsActive,
			&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}

// ProductVariant repository

type productVariantRepository struct {
	db *pgxpool.Pool
}

func NewProductVariantRepository(db *pgxpool.Pool) repository.ProductVariantRepository {
	return &productVariantRepository{db: db}
}

func (r *productVariantRepository) Create(ctx context.Context, v *model.ProductVariant) error {
	attrJSON, _ := json.Marshal(v.Attributes)

	// Convert empty barcode to nil to avoid UNIQUE constraint violation on empty strings
	var barcode interface{} = v.Barcode
	if v.Barcode == "" {
		barcode = nil
	}

	query := `INSERT INTO product_variants (id, product_id, sku, barcode, name, cost_price, selling_price, compare_at_price, weight, attributes, images, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`
	_, err := r.db.Exec(ctx, query,
		v.ID, v.ProductID, v.SKU, barcode, v.Name, v.CostPrice, v.SellingPrice,
		v.CompareAtPrice, v.Weight, attrJSON, v.Images, v.IsActive, v.CreatedAt, v.UpdatedAt,
	)
	return err
}

func (r *productVariantRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ProductVariant, error) {
	v := &model.ProductVariant{}
	var attrJSON []byte
	query := `SELECT id, product_id, sku, COALESCE(barcode, ''), name, cost_price, selling_price, compare_at_price, weight, attributes, images, is_active, created_at, updated_at
		FROM product_variants WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&v.ID, &v.ProductID, &v.SKU, &v.Barcode, &v.Name, &v.CostPrice, &v.SellingPrice,
		&v.CompareAtPrice, &v.Weight, &attrJSON, &v.Images, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("variant not found")
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(attrJSON, &v.Attributes)
	return v, nil
}

func (r *productVariantRepository) GetBySKU(ctx context.Context, sku string) (*model.ProductVariant, error) {
	v := &model.ProductVariant{}
	var attrJSON []byte
	query := `SELECT id, product_id, sku, COALESCE(barcode, ''), name, cost_price, selling_price, compare_at_price, weight, attributes, images, is_active, created_at, updated_at
		FROM product_variants WHERE sku = $1`
	err := r.db.QueryRow(ctx, query, sku).Scan(
		&v.ID, &v.ProductID, &v.SKU, &v.Barcode, &v.Name, &v.CostPrice, &v.SellingPrice,
		&v.CompareAtPrice, &v.Weight, &attrJSON, &v.Images, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("variant not found")
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(attrJSON, &v.Attributes)
	return v, nil
}

func (r *productVariantRepository) GetByBarcode(ctx context.Context, barcode string) (*model.ProductVariant, error) {
	v := &model.ProductVariant{}
	var attrJSON []byte
	query := `SELECT id, product_id, sku, COALESCE(barcode, ''), name, cost_price, selling_price, compare_at_price, weight, attributes, images, is_active, created_at, updated_at
		FROM product_variants WHERE barcode = $1`
	err := r.db.QueryRow(ctx, query, barcode).Scan(
		&v.ID, &v.ProductID, &v.SKU, &v.Barcode, &v.Name, &v.CostPrice, &v.SellingPrice,
		&v.CompareAtPrice, &v.Weight, &attrJSON, &v.Images, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("variant not found")
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(attrJSON, &v.Attributes)
	return v, nil
}

func (r *productVariantRepository) GetByProductID(ctx context.Context, productID uuid.UUID) ([]model.ProductVariant, error) {
	query := `SELECT id, product_id, sku, COALESCE(barcode, ''), name, cost_price, selling_price, compare_at_price, weight, attributes, images, is_active, created_at, updated_at
		FROM product_variants WHERE product_id = $1 ORDER BY name`
	rows, err := r.db.Query(ctx, query, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var variants []model.ProductVariant
	for rows.Next() {
		var v model.ProductVariant
		var attrJSON []byte
		if err := rows.Scan(
			&v.ID, &v.ProductID, &v.SKU, &v.Barcode, &v.Name, &v.CostPrice, &v.SellingPrice,
			&v.CompareAtPrice, &v.Weight, &attrJSON, &v.Images, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(attrJSON, &v.Attributes)
		variants = append(variants, v)
	}
	return variants, nil
}

func (r *productVariantRepository) Update(ctx context.Context, v *model.ProductVariant) error {
	attrJSON, _ := json.Marshal(v.Attributes)

	var barcode interface{} = v.Barcode
	if v.Barcode == "" {
		barcode = nil
	}

	query := `UPDATE product_variants SET sku = $2, barcode = $3, name = $4, cost_price = $5, selling_price = $6, compare_at_price = $7, weight = $8, attributes = $9, images = $10, is_active = $11, updated_at = NOW()
		WHERE id = $1`
	_, err := r.db.Exec(ctx, query,
		v.ID, v.SKU, barcode, v.Name, v.CostPrice, v.SellingPrice,
		v.CompareAtPrice, v.Weight, attrJSON, v.Images, v.IsActive,
	)
	return err
}

func (r *productVariantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM product_variants WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
