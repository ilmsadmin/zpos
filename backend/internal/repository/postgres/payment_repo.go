package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
)

type paymentRepository struct {
	db *pgxpool.Pool
}

func NewPaymentRepository(db *pgxpool.Pool) repository.PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) Create(ctx context.Context, p *model.Payment) error {
	query := `INSERT INTO payments (id, order_id, method, amount, status, transaction_id, notes, paid_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	_, err := r.db.Exec(ctx, query,
		p.ID, p.OrderID, p.Method, p.Amount, p.Status, p.TransactionID,
		p.Notes, p.PaidAt, p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func (r *paymentRepository) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]model.Payment, error) {
	query := `SELECT id, order_id, method, amount, status, transaction_id, notes, paid_at, created_at, updated_at
		FROM payments WHERE order_id = $1 ORDER BY created_at`
	rows, err := r.db.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []model.Payment
	for rows.Next() {
		var p model.Payment
		if err := rows.Scan(
			&p.ID, &p.OrderID, &p.Method, &p.Amount, &p.Status, &p.TransactionID,
			&p.Notes, &p.PaidAt, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		payments = append(payments, p)
	}
	return payments, nil
}

func (r *paymentRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE payments SET status = $2, updated_at = NOW() WHERE id = $1`, id, status)
	return err
}
