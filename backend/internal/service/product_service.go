package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
	appErrors "github.com/zplus/pos/pkg/errors"
)

type productService struct {
	productRepo  repository.ProductRepository
	variantRepo  repository.ProductVariantRepository
	categoryRepo repository.CategoryRepository
	invRepo      repository.InventoryRepository
}

func NewProductService(
	productRepo repository.ProductRepository,
	variantRepo repository.ProductVariantRepository,
	categoryRepo repository.CategoryRepository,
	invRepo repository.InventoryRepository,
) ProductService {
	return &productService{
		productRepo:  productRepo,
		variantRepo:  variantRepo,
		categoryRepo: categoryRepo,
		invRepo:      invRepo,
	}
}

func (s *productService) Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateProductRequest) (*dto.ProductResponse, error) {
	now := time.Now()
	product := &model.Product{
		ID:          uuid.New(),
		StoreID:     storeID,
		CategoryID:  req.CategoryID,
		Name:        req.Name,
		Description: req.Description,
		Brand:       req.Brand,
		Unit:        req.Unit,
		Tags:        model.StringArr(req.Tags),
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.productRepo.Create(ctx, product); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create product: %w", err))
	}

	// Create variants
	for i, v := range req.Variants {
		attrJSON, _ := json.Marshal(v.Attributes)
		var attrs model.JSONB
		_ = json.Unmarshal(attrJSON, &attrs)

		// Auto-generate SKU if not provided
		sku := v.SKU
		if sku == "" {
			shortID := strings.ToUpper(product.ID.String()[:8])
			sku = fmt.Sprintf("SKU-%s-%d", shortID, i+1)
		}

		// Convert empty barcode to nil-equivalent (empty string) — handle at DB level
		barcode := v.Barcode

		variant := &model.ProductVariant{
			ID:             uuid.New(),
			ProductID:      product.ID,
			SKU:            sku,
			Barcode:        barcode,
			Name:           v.Name,
			CostPrice:      v.CostPrice,
			SellingPrice:   v.SellingPrice,
			CompareAtPrice: v.CompareAtPrice,
			Weight:         v.Weight,
			Attributes:     attrs,
			Images:         model.StringArr(v.Images),
			IsActive:       true,
			CreatedAt:      now,
			UpdatedAt:      now,
		}

		if err := s.variantRepo.Create(ctx, variant); err != nil {
			return nil, appErrors.Internal(fmt.Errorf("failed to create variant: %w", err))
		}

		// Create initial inventory
		if v.InitialStock > 0 {
			inv := &model.Inventory{
				ID:               uuid.New(),
				StoreID:          storeID,
				ProductVariantID: variant.ID,
				Quantity:         v.InitialStock,
				ReservedQty:      0,
				MinStockLevel:    5,
				UpdatedAt:        now,
			}
			if err := s.invRepo.Create(ctx, inv); err != nil {
				return nil, appErrors.Internal(fmt.Errorf("failed to create inventory: %w", err))
			}
		}
	}

	return s.GetByID(ctx, product.ID)
}

func (s *productService) GetByID(ctx context.Context, id uuid.UUID) (*dto.ProductResponse, error) {
	product, err := s.productRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("product")
	}

	// Load variants
	variants, _ := s.variantRepo.GetByProductID(ctx, product.ID)

	// Load inventory for each variant
	for i := range variants {
		inv, _ := s.invRepo.GetByVariantID(ctx, product.StoreID, variants[i].ID)
		if inv != nil {
			variants[i].Inventory = inv
		}
	}

	// Load category
	category, _ := s.categoryRepo.GetByID(ctx, product.CategoryID)

	return toProductResponse(product, variants, category), nil
}

func (s *productService) List(ctx context.Context, storeID uuid.UUID, params *dto.ProductListParams) ([]dto.ProductResponse, int64, error) {
	repoParams := repository.ProductListParams{
		Page:      params.Page,
		Limit:     params.Limit,
		Search:    params.Search,
		Brand:     params.Brand,
		IsActive:  params.IsActive,
		SortBy:    params.SortBy,
		SortOrder: params.SortOrder,
		MinPrice:  params.MinPrice,
		MaxPrice:  params.MaxPrice,
	}

	// When a category_id is specified, collect it + all descendant category IDs
	// so that clicking a parent category shows products from child categories too
	if params.CategoryID != uuid.Nil {
		descendantIDs, err := s.categoryRepo.GetDescendantIDs(ctx, storeID, params.CategoryID)
		if err != nil || len(descendantIDs) == 0 {
			// Fallback to exact match
			repoParams.CategoryID = params.CategoryID
		} else {
			repoParams.CategoryIDs = descendantIDs
		}
	}

	products, total, err := s.productRepo.List(ctx, storeID, repoParams)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.ProductResponse
	for i := range products {
		variants, _ := s.variantRepo.GetByProductID(ctx, products[i].ID)
		// Load inventory for each variant
		for j := range variants {
			inv, _ := s.invRepo.GetByVariantID(ctx, storeID, variants[j].ID)
			if inv != nil {
				variants[j].Inventory = inv
			}
		}
		// Load category
		var category *model.Category
		if products[i].CategoryID != uuid.Nil {
			category, _ = s.categoryRepo.GetByID(ctx, products[i].CategoryID)
		}
		responses = append(responses, *toProductResponse(&products[i], variants, category))
	}
	return responses, total, nil
}

func (s *productService) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateProductRequest) (*dto.ProductResponse, error) {
	product, err := s.productRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("product")
	}

	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Description != "" {
		product.Description = req.Description
	}
	if req.Brand != "" {
		product.Brand = req.Brand
	}
	if req.Unit != "" {
		product.Unit = req.Unit
	}
	if req.CategoryID != nil {
		product.CategoryID = *req.CategoryID
	}
	if req.Tags != nil {
		product.Tags = model.StringArr(req.Tags)
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}

	if err := s.productRepo.Update(ctx, product); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update product: %w", err))
	}

	return s.GetByID(ctx, product.ID)
}

func (s *productService) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.productRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("product")
	}
	return s.productRepo.Delete(ctx, id)
}

func (s *productService) Search(ctx context.Context, storeID uuid.UUID, query string, limit int) ([]dto.ProductResponse, error) {
	if limit <= 0 {
		limit = 20
	}
	products, err := s.productRepo.Search(ctx, storeID, query, limit)
	if err != nil {
		return nil, err
	}

	var responses []dto.ProductResponse
	for i := range products {
		variants, _ := s.variantRepo.GetByProductID(ctx, products[i].ID)
		for j := range variants {
			inv, _ := s.invRepo.GetByVariantID(ctx, storeID, variants[j].ID)
			if inv != nil {
				variants[j].Inventory = inv
			}
		}
		// Load category
		var category *model.Category
		if products[i].CategoryID != uuid.Nil {
			category, _ = s.categoryRepo.GetByID(ctx, products[i].CategoryID)
		}
		responses = append(responses, *toProductResponse(&products[i], variants, category))
	}
	return responses, nil
}

func (s *productService) CreateVariant(ctx context.Context, productID uuid.UUID, req *dto.CreateVariantRequest) (*dto.VariantResponse, error) {
	product, err := s.productRepo.GetByID(ctx, productID)
	if err != nil {
		return nil, appErrors.NotFound("product")
	}

	attrJSON, _ := json.Marshal(req.Attributes)
	var attrs model.JSONB
	_ = json.Unmarshal(attrJSON, &attrs)

	now := time.Now()
	variant := &model.ProductVariant{
		ID:             uuid.New(),
		ProductID:      productID,
		SKU:            req.SKU,
		Barcode:        req.Barcode,
		Name:           req.Name,
		CostPrice:      req.CostPrice,
		SellingPrice:   req.SellingPrice,
		CompareAtPrice: req.CompareAtPrice,
		Weight:         req.Weight,
		Attributes:     attrs,
		Images:         model.StringArr(req.Images),
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// Auto-generate SKU if not provided
	if variant.SKU == "" {
		shortID := strings.ToUpper(variant.ID.String()[:8])
		variant.SKU = fmt.Sprintf("SKU-%s", shortID)
	}

	if err := s.variantRepo.Create(ctx, variant); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create variant: %w", err))
	}

	// Create initial inventory
	if req.InitialStock > 0 {
		inv := &model.Inventory{
			ID:               uuid.New(),
			StoreID:          product.StoreID,
			ProductVariantID: variant.ID,
			Quantity:         req.InitialStock,
			ReservedQty:      0,
			MinStockLevel:    5,
			UpdatedAt:        now,
		}
		_ = s.invRepo.Create(ctx, inv)
	}

	return toVariantResponse(variant, nil), nil
}

func (s *productService) UpdateVariant(ctx context.Context, id uuid.UUID, req *dto.UpdateVariantRequest) (*dto.VariantResponse, error) {
	variant, err := s.variantRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("variant")
	}

	if req.SKU != "" {
		variant.SKU = req.SKU
	}
	if req.Barcode != "" {
		variant.Barcode = req.Barcode
	}
	if req.Name != "" {
		variant.Name = req.Name
	}
	if req.CostPrice != nil {
		variant.CostPrice = *req.CostPrice
	}
	if req.SellingPrice != nil {
		variant.SellingPrice = *req.SellingPrice
	}
	if req.CompareAtPrice != nil {
		variant.CompareAtPrice = req.CompareAtPrice
	}
	if req.Weight != nil {
		variant.Weight = req.Weight
	}
	if req.Attributes != nil {
		attrJSON, _ := json.Marshal(req.Attributes)
		var attrs model.JSONB
		_ = json.Unmarshal(attrJSON, &attrs)
		variant.Attributes = attrs
	}
	if req.Images != nil {
		variant.Images = model.StringArr(req.Images)
	}
	if req.IsActive != nil {
		variant.IsActive = *req.IsActive
	}

	if err := s.variantRepo.Update(ctx, variant); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update variant: %w", err))
	}

	return toVariantResponse(variant, nil), nil
}

func (s *productService) DeleteVariant(ctx context.Context, id uuid.UUID) error {
	_, err := s.variantRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("variant")
	}
	return s.variantRepo.Delete(ctx, id)
}

func (s *productService) GetByBarcode(ctx context.Context, barcode string) (*dto.ProductResponse, error) {
	variant, err := s.variantRepo.GetByBarcode(ctx, barcode)
	if err != nil {
		return nil, appErrors.NotFound("variant")
	}
	return s.GetByID(ctx, variant.ProductID)
}

func toProductResponse(product *model.Product, variants []model.ProductVariant, category *model.Category) *dto.ProductResponse {
	resp := &dto.ProductResponse{
		ID:          product.ID,
		StoreID:     product.StoreID,
		CategoryID:  product.CategoryID,
		Name:        product.Name,
		Slug:        product.Slug,
		Description: product.Description,
		Brand:       product.Brand,
		Unit:        product.Unit,
		Tags:        []string(product.Tags),
		IsActive:    product.IsActive,
		CreatedAt:   product.CreatedAt,
		UpdatedAt:   product.UpdatedAt,
	}

	if category != nil {
		resp.Category = toCategoryResponse(category)
	}

	for i := range variants {
		resp.Variants = append(resp.Variants, *toVariantResponse(&variants[i], variants[i].Inventory))
	}

	return resp
}

func toVariantResponse(v *model.ProductVariant, inv *model.Inventory) *dto.VariantResponse {
	resp := &dto.VariantResponse{
		ID:             v.ID,
		ProductID:      v.ProductID,
		SKU:            v.SKU,
		Barcode:        v.Barcode,
		Name:           v.Name,
		CostPrice:      v.CostPrice,
		SellingPrice:   v.SellingPrice,
		CompareAtPrice: v.CompareAtPrice,
		Weight:         v.Weight,
		Attributes:     map[string]interface{}(v.Attributes),
		Images:         []string(v.Images),
		IsActive:       v.IsActive,
		CreatedAt:      v.CreatedAt,
	}

	if inv != nil {
		resp.Inventory = &dto.InventoryResponse{
			ID:               inv.ID,
			StoreID:          inv.StoreID,
			ProductVariantID: inv.ProductVariantID,
			Quantity:         inv.Quantity,
			ReservedQty:      inv.ReservedQty,
			AvailableQty:     inv.AvailableQty(),
			MinStockLevel:    inv.MinStockLevel,
			MaxStockLevel:    inv.MaxStockLevel,
			Location:         inv.Location,
			IsLowStock:       inv.IsLowStock(),
		}
	}

	return resp
}
