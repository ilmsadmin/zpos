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

type customerRepository struct {
	db *pgxpool.Pool
}

func NewCustomerRepository(db *pgxpool.Pool) repository.CustomerRepository {
	return &customerRepository{db: db}
}

func (r *customerRepository) Create(ctx context.Context, c *model.Customer) error {
	query := `INSERT INTO customers (id, store_id, full_name, phone, email, address, date_of_birth, gender, notes, total_spent, order_count, points, tags, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`
	_, err := r.db.Exec(ctx, query,
		c.ID, c.StoreID, c.FullName, c.Phone, c.Email, c.Address,
		c.DateOfBirth, c.Gender, c.Notes, c.TotalSpent, c.OrderCount,
		c.Points, c.Tags, c.IsActive, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *customerRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Customer, error) {
	c := &model.Customer{}
	query := `SELECT id, store_id, full_name, phone, email, address, date_of_birth, gender, notes, total_spent, order_count, points, tags, is_active, created_at, updated_at
		FROM customers WHERE id = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.StoreID, &c.FullName, &c.Phone, &c.Email, &c.Address,
		&c.DateOfBirth, &c.Gender, &c.Notes, &c.TotalSpent, &c.OrderCount,
		&c.Points, &c.Tags, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("customer not found")
	}
	return c, err
}

func (r *customerRepository) GetByPhone(ctx context.Context, storeID uuid.UUID, phone string) (*model.Customer, error) {
	c := &model.Customer{}
	query := `SELECT id, store_id, full_name, phone, email, address, date_of_birth, gender, notes, total_spent, order_count, points, tags, is_active, created_at, updated_at
		FROM customers WHERE store_id = $1 AND phone = $2 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, storeID, phone).Scan(
		&c.ID, &c.StoreID, &c.FullName, &c.Phone, &c.Email, &c.Address,
		&c.DateOfBirth, &c.Gender, &c.Notes, &c.TotalSpent, &c.OrderCount,
		&c.Points, &c.Tags, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("customer not found")
	}
	return c, err
}

func (r *customerRepository) List(ctx context.Context, storeID uuid.UUID, page, limit int, search string) ([]model.Customer, int64, error) {
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

	conditions = append(conditions, "deleted_at IS NULL")

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(full_name ILIKE $%d OR phone ILIKE $%d OR email ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM customers %s`, whereClause)
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := fmt.Sprintf(`SELECT id, store_id, full_name, phone, email, address, date_of_birth, gender, notes, total_spent, order_count, points, tags, is_active, created_at, updated_at
		FROM customers %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var customers []model.Customer
	for rows.Next() {
		var c model.Customer
		if err := rows.Scan(
			&c.ID, &c.StoreID, &c.FullName, &c.Phone, &c.Email, &c.Address,
			&c.DateOfBirth, &c.Gender, &c.Notes, &c.TotalSpent, &c.OrderCount,
			&c.Points, &c.Tags, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		customers = append(customers, c)
	}
	return customers, total, nil
}

func (r *customerRepository) Update(ctx context.Context, c *model.Customer) error {
	query := `UPDATE customers SET full_name = $2, phone = $3, email = $4, address = $5, date_of_birth = $6, gender = $7, notes = $8, tags = $9, is_active = $10, updated_at = $11
		WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query,
		c.ID, c.FullName, c.Phone, c.Email, c.Address,
		c.DateOfBirth, c.Gender, c.Notes, c.Tags, c.IsActive, time.Now(),
	)
	return err
}

func (r *customerRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE customers SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	return err
}

func (r *customerRepository) UpdateStats(ctx context.Context, id uuid.UUID, totalSpent float64, orderCount int) error {
	query := `UPDATE customers SET total_spent = total_spent + $2, order_count = order_count + $3, updated_at = $4 WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, id, totalSpent, orderCount, time.Now())
	return err
}
