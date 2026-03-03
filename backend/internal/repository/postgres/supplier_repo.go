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

type supplierRepository struct {
	db *pgxpool.Pool
}

func NewSupplierRepository(db *pgxpool.Pool) repository.SupplierRepository {
	return &supplierRepository{db: db}
}

func (r *supplierRepository) Create(ctx context.Context, s *model.Supplier) error {
	query := `INSERT INTO suppliers (id, store_id, name, contact_name, phone, email, address, tax_code, bank_account, bank_name, notes, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`
	_, err := r.db.Exec(ctx, query,
		s.ID, s.StoreID, s.Name, s.ContactName, s.Phone, s.Email, s.Address,
		s.TaxCode, s.BankAccount, s.BankName, s.Notes, s.IsActive,
		s.CreatedAt, s.UpdatedAt,
	)
	return err
}

func (r *supplierRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Supplier, error) {
	s := &model.Supplier{}
	query := `SELECT id, store_id, name, contact_name, phone, email, address, tax_code, bank_account, bank_name, notes, is_active, created_at, updated_at
		FROM suppliers WHERE id = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.StoreID, &s.Name, &s.ContactName, &s.Phone, &s.Email, &s.Address,
		&s.TaxCode, &s.BankAccount, &s.BankName, &s.Notes, &s.IsActive,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("supplier not found")
	}
	return s, err
}

func (r *supplierRepository) List(ctx context.Context, storeID uuid.UUID, page, limit int, search string) ([]model.Supplier, int64, error) {
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
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR contact_name ILIKE $%d OR phone ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var total int64
	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM suppliers %s`, whereClause)
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := fmt.Sprintf(`SELECT id, store_id, name, contact_name, phone, email, address, tax_code, bank_account, bank_name, notes, is_active, created_at, updated_at
		FROM suppliers %s ORDER BY name LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var suppliers []model.Supplier
	for rows.Next() {
		var s model.Supplier
		if err := rows.Scan(
			&s.ID, &s.StoreID, &s.Name, &s.ContactName, &s.Phone, &s.Email, &s.Address,
			&s.TaxCode, &s.BankAccount, &s.BankName, &s.Notes, &s.IsActive,
			&s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		suppliers = append(suppliers, s)
	}
	return suppliers, total, nil
}

func (r *supplierRepository) Update(ctx context.Context, s *model.Supplier) error {
	query := `UPDATE suppliers SET name = $2, contact_name = $3, phone = $4, email = $5, address = $6, tax_code = $7, bank_account = $8, bank_name = $9, notes = $10, is_active = $11, updated_at = $12
		WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query,
		s.ID, s.Name, s.ContactName, s.Phone, s.Email, s.Address,
		s.TaxCode, s.BankAccount, s.BankName, s.Notes, s.IsActive, time.Now(),
	)
	return err
}

func (r *supplierRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE suppliers SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	return err
}
