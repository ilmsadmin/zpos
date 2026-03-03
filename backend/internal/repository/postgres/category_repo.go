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
	"golang.org/x/text/unicode/norm"
)

type categoryRepository struct {
	db *pgxpool.Pool
}

func NewCategoryRepository(db *pgxpool.Pool) repository.CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) Create(ctx context.Context, category *model.Category) error {
	if category.Slug == "" {
		category.Slug = generateSlug(category.Name)
	}
	query := `INSERT INTO categories (id, store_id, parent_id, name, slug, description, image_url, sort_order, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
	_, err := r.db.Exec(ctx, query,
		category.ID, category.StoreID, category.ParentID, category.Name, category.Slug,
		category.Description, category.ImageURL, category.SortOrder, category.IsActive,
		category.CreatedAt, category.UpdatedAt,
	)
	return err
}

func (r *categoryRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Category, error) {
	cat := &model.Category{}
	query := `SELECT id, store_id, parent_id, name, slug, description, image_url, sort_order, is_active, created_at, updated_at
		FROM categories WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(
		&cat.ID, &cat.StoreID, &cat.ParentID, &cat.Name, &cat.Slug,
		&cat.Description, &cat.ImageURL, &cat.SortOrder, &cat.IsActive,
		&cat.CreatedAt, &cat.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("category not found")
	}
	return cat, err
}

func (r *categoryRepository) GetByStoreID(ctx context.Context, storeID uuid.UUID) ([]model.Category, error) {
	query := `SELECT id, store_id, parent_id, name, slug, description, image_url, sort_order, is_active, created_at, updated_at
		FROM categories WHERE store_id = $1 ORDER BY sort_order, name`
	rows, err := r.db.Query(ctx, query, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []model.Category
	for rows.Next() {
		var c model.Category
		if err := rows.Scan(
			&c.ID, &c.StoreID, &c.ParentID, &c.Name, &c.Slug,
			&c.Description, &c.ImageURL, &c.SortOrder, &c.IsActive,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	return cats, nil
}

func (r *categoryRepository) GetTree(ctx context.Context, storeID uuid.UUID) ([]model.Category, error) {
	// Get all categories for this store, build tree in memory
	allCats, err := r.GetByStoreID(ctx, storeID)
	if err != nil {
		return nil, err
	}
	return buildCategoryTree(allCats, nil), nil
}

func (r *categoryRepository) GetDescendantIDs(ctx context.Context, storeID uuid.UUID, parentID uuid.UUID) ([]uuid.UUID, error) {
	allCats, err := r.GetByStoreID(ctx, storeID)
	if err != nil {
		return nil, err
	}

	// BFS to collect parentID + all descendant IDs
	ids := []uuid.UUID{parentID}
	queue := []uuid.UUID{parentID}
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		for _, c := range allCats {
			if c.ParentID != nil && *c.ParentID == current {
				ids = append(ids, c.ID)
				queue = append(queue, c.ID)
			}
		}
	}
	return ids, nil
}

func (r *categoryRepository) Update(ctx context.Context, category *model.Category) error {
	query := `UPDATE categories SET parent_id = $2, name = $3, slug = $4, description = $5, image_url = $6, sort_order = $7, is_active = $8, updated_at = $9
		WHERE id = $1`
	_, err := r.db.Exec(ctx, query,
		category.ID, category.ParentID, category.Name, category.Slug,
		category.Description, category.ImageURL, category.SortOrder, category.IsActive, time.Now(),
	)
	return err
}

func (r *categoryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM categories WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

// buildCategoryTree builds a hierarchical tree from flat category list
func buildCategoryTree(cats []model.Category, parentID *uuid.UUID) []model.Category {
	var tree []model.Category
	for _, c := range cats {
		if (parentID == nil && c.ParentID == nil) || (parentID != nil && c.ParentID != nil && *c.ParentID == *parentID) {
			c.Children = buildCategoryTree(cats, &c.ID)
			tree = append(tree, c)
		}
	}
	return tree
}

// generateSlug creates a URL-friendly slug from a string
func generateSlug(s string) string {
	s = norm.NFKD.String(s)
	s = strings.ToLower(s)
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == ' ' {
			return r
		}
		return -1
	}, s)
	s = strings.Join(strings.Fields(s), "-")
	return s
}
