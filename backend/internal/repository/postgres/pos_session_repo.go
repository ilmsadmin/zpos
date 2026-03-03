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

type posSessionRepository struct {
	db *pgxpool.Pool
}

func NewPOSSessionRepository(db *pgxpool.Pool) repository.POSSessionRepository {
	return &posSessionRepository{db: db}
}

func (r *posSessionRepository) Create(ctx context.Context, s *model.POSSession) error {
	query := `INSERT INTO pos_sessions (id, store_id, user_id, opening_amount, closing_amount, expected_amount, difference, total_sales, total_orders, notes, status, opened_at, closed_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`
	_, err := r.db.Exec(ctx, query,
		s.ID, s.StoreID, s.UserID, s.OpeningAmount, s.ClosingAmount,
		s.ExpectedAmount, s.Difference, s.TotalSales, s.TotalOrders,
		s.Notes, s.Status, s.OpenedAt, s.ClosedAt, s.CreatedAt, s.UpdatedAt,
	)
	return err
}

func (r *posSessionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.POSSession, error) {
	s := &model.POSSession{}
	query := `SELECT id, store_id, user_id, opening_amount, closing_amount, expected_amount, difference, total_sales, total_orders, notes, status, opened_at, closed_at, created_at, updated_at
		FROM pos_sessions WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.StoreID, &s.UserID, &s.OpeningAmount, &s.ClosingAmount,
		&s.ExpectedAmount, &s.Difference, &s.TotalSales, &s.TotalOrders,
		&s.Notes, &s.Status, &s.OpenedAt, &s.ClosedAt, &s.CreatedAt, &s.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("POS session not found")
	}
	return s, err
}

func (r *posSessionRepository) GetOpenSession(ctx context.Context, storeID, userID uuid.UUID) (*model.POSSession, error) {
	s := &model.POSSession{}
	query := `SELECT id, store_id, user_id, opening_amount, closing_amount, expected_amount, difference, total_sales, total_orders, notes, status, opened_at, closed_at, created_at, updated_at
		FROM pos_sessions WHERE store_id = $1 AND user_id = $2 AND status = 'open'
		ORDER BY opened_at DESC LIMIT 1`
	err := r.db.QueryRow(ctx, query, storeID, userID).Scan(
		&s.ID, &s.StoreID, &s.UserID, &s.OpeningAmount, &s.ClosingAmount,
		&s.ExpectedAmount, &s.Difference, &s.TotalSales, &s.TotalOrders,
		&s.Notes, &s.Status, &s.OpenedAt, &s.ClosedAt, &s.CreatedAt, &s.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("no open POS session found")
	}
	return s, err
}

func (r *posSessionRepository) Close(ctx context.Context, s *model.POSSession) error {
	query := `UPDATE pos_sessions SET closing_amount = $2, expected_amount = $3, difference = $4, total_sales = $5, total_orders = $6, notes = $7, status = 'closed', closed_at = $8, updated_at = $9
		WHERE id = $1`
	_, err := r.db.Exec(ctx, query,
		s.ID, s.ClosingAmount, s.ExpectedAmount, s.Difference,
		s.TotalSales, s.TotalOrders, s.Notes, time.Now(), time.Now(),
	)
	return err
}

func (r *posSessionRepository) UpdateSales(ctx context.Context, id uuid.UUID, totalSales float64, totalOrders int) error {
	query := `UPDATE pos_sessions SET total_sales = $2, total_orders = $3, updated_at = $4 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id, totalSales, totalOrders, time.Now())
	return err
}

func (r *posSessionRepository) List(ctx context.Context, storeID uuid.UUID, page, limit int) ([]model.POSSession, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM pos_sessions WHERE store_id = $1`, storeID).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := `SELECT id, store_id, user_id, opening_amount, closing_amount, expected_amount, difference, total_sales, total_orders, notes, status, opened_at, closed_at, created_at, updated_at
		FROM pos_sessions WHERE store_id = $1 ORDER BY opened_at DESC LIMIT $2 OFFSET $3`
	rows, err := r.db.Query(ctx, query, storeID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var sessions []model.POSSession
	for rows.Next() {
		var s model.POSSession
		if err := rows.Scan(
			&s.ID, &s.StoreID, &s.UserID, &s.OpeningAmount, &s.ClosingAmount,
			&s.ExpectedAmount, &s.Difference, &s.TotalSales, &s.TotalOrders,
			&s.Notes, &s.Status, &s.OpenedAt, &s.ClosedAt, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		sessions = append(sessions, s)
	}
	return sessions, total, nil
}
