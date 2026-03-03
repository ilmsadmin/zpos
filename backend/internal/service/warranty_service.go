package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
	"github.com/zplus/pos/internal/repository"
	appErrors "github.com/zplus/pos/pkg/errors"
)

type warrantyService struct {
	warrantyRepo repository.WarrantyRepository
	notifSvc     NotificationService
}

func NewWarrantyService(warrantyRepo repository.WarrantyRepository, notifSvc ...NotificationService) WarrantyService {
	svc := &warrantyService{warrantyRepo: warrantyRepo}
	if len(notifSvc) > 0 {
		svc.notifSvc = notifSvc[0]
	}
	return svc
}

func (s *warrantyService) Create(ctx context.Context, storeID uuid.UUID, req *dto.CreateWarrantyRequest) (*dto.WarrantyResponse, error) {
	now := time.Now()
	endDate := now.AddDate(0, req.WarrantyMonths, 0)
	warrantyCode := fmt.Sprintf("WRT-%s-%d", now.Format("20060102"), now.UnixMilli()%100000)

	warranty := &model.Warranty{
		ID:               uuid.New(),
		StoreID:          storeID,
		OrderItemID:      req.OrderItemID,
		CustomerID:       req.CustomerID,
		ProductVariantID: req.ProductVariantID,
		WarrantyCode:     warrantyCode,
		SerialNumber:     req.SerialNumber,
		StartDate:        now,
		EndDate:          endDate,
		WarrantyMonths:   req.WarrantyMonths,
		Status:           model.WarrantyStatusActive,
		Terms:            req.Terms,
		Notes:            req.Notes,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := s.warrantyRepo.Create(ctx, warranty); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create warranty: %w", err))
	}

	return toWarrantyResponse(warranty, nil), nil
}

func (s *warrantyService) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateWarrantyRequest) (*dto.WarrantyResponse, error) {
	warranty, err := s.warrantyRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("warranty")
	}

	if req.SerialNumber != "" {
		warranty.SerialNumber = req.SerialNumber
	}
	if req.Terms != "" {
		warranty.Terms = req.Terms
	}
	if req.Notes != "" {
		warranty.Notes = req.Notes
	}
	warranty.UpdatedAt = time.Now()

	if err := s.warrantyRepo.Update(ctx, warranty); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update warranty: %w", err))
	}

	claims, _ := s.warrantyRepo.GetClaimsByWarrantyID(ctx, warranty.ID)
	return toWarrantyResponse(warranty, claims), nil
}

func (s *warrantyService) Void(ctx context.Context, id uuid.UUID) error {
	warranty, err := s.warrantyRepo.GetByID(ctx, id)
	if err != nil {
		return appErrors.NotFound("warranty")
	}

	if warranty.Status == model.WarrantyStatusVoided {
		return appErrors.BadRequest("Bảo hành đã bị hủy")
	}

	warranty.Status = model.WarrantyStatusVoided
	warranty.UpdatedAt = time.Now()

	return s.warrantyRepo.Update(ctx, warranty)
}

func (s *warrantyService) GetByID(ctx context.Context, id uuid.UUID) (*dto.WarrantyResponse, error) {
	warranty, err := s.warrantyRepo.GetByID(ctx, id)
	if err != nil {
		return nil, appErrors.NotFound("warranty")
	}

	claims, _ := s.warrantyRepo.GetClaimsByWarrantyID(ctx, warranty.ID)
	resp := toWarrantyResponse(warranty, claims)
	s.populateWarrantyRelations(ctx, resp, warranty)
	return resp, nil
}

func (s *warrantyService) GetByCode(ctx context.Context, code string) (*dto.WarrantyResponse, error) {
	warranty, err := s.warrantyRepo.GetByCode(ctx, code)
	if err != nil {
		return nil, appErrors.NotFound("warranty")
	}

	claims, _ := s.warrantyRepo.GetClaimsByWarrantyID(ctx, warranty.ID)
	resp := toWarrantyResponse(warranty, claims)
	s.populateWarrantyRelations(ctx, resp, warranty)
	return resp, nil
}

func (s *warrantyService) List(ctx context.Context, storeID uuid.UUID, params *dto.WarrantyListParams) ([]dto.WarrantyResponse, int64, error) {
	repoParams := repository.WarrantyListParams{
		Page:       params.Page,
		Limit:      params.Limit,
		Search:     params.Search,
		Status:     params.Status,
		CustomerID: params.CustomerID,
		DateFrom:   params.DateFrom,
		DateTo:     params.DateTo,
	}

	warranties, total, err := s.warrantyRepo.List(ctx, storeID, repoParams)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.WarrantyResponse
	for i := range warranties {
		resp := toWarrantyResponse(&warranties[i], nil)
		s.populateWarrantyRelations(ctx, resp, &warranties[i])
		responses = append(responses, *resp)
	}
	return responses, total, nil
}

func (s *warrantyService) GetExpiring(ctx context.Context, storeID uuid.UUID, days int, page, limit int) ([]dto.WarrantyResponse, int64, error) {
	if days <= 0 {
		days = 30
	}

	warranties, total, err := s.warrantyRepo.GetExpiring(ctx, storeID, days, page, limit)
	if err != nil {
		return nil, 0, err
	}

	var responses []dto.WarrantyResponse
	for i := range warranties {
		resp := toWarrantyResponse(&warranties[i], nil)
		s.populateWarrantyRelations(ctx, resp, &warranties[i])
		responses = append(responses, *resp)
	}
	return responses, total, nil
}

func (s *warrantyService) CountActiveClaims(ctx context.Context, storeID uuid.UUID) (int64, error) {
	return s.warrantyRepo.CountActiveClaimsByStoreID(ctx, storeID)
}

func (s *warrantyService) Lookup(ctx context.Context, query string) ([]dto.WarrantyResponse, error) {
	var allWarranties []model.Warranty

	// Try warranty code
	if w, err := s.warrantyRepo.GetByCode(ctx, query); err == nil {
		allWarranties = append(allWarranties, *w)
	}

	// Try serial number
	if results, err := s.warrantyRepo.GetBySerialNumber(ctx, query); err == nil {
		allWarranties = appendUnique(allWarranties, results)
	}

	// Try customer phone
	if results, err := s.warrantyRepo.GetByCustomerPhone(ctx, query); err == nil {
		allWarranties = appendUnique(allWarranties, results)
	}

	// Try order number
	if results, err := s.warrantyRepo.GetByOrderNumber(ctx, query); err == nil {
		allWarranties = appendUnique(allWarranties, results)
	}

	var responses []dto.WarrantyResponse
	for i := range allWarranties {
		claims, _ := s.warrantyRepo.GetClaimsByWarrantyID(ctx, allWarranties[i].ID)
		resp := toWarrantyResponse(&allWarranties[i], claims)
		s.populateWarrantyRelations(ctx, resp, &allWarranties[i])
		responses = append(responses, *resp)
	}
	return responses, nil
}

func (s *warrantyService) CreateClaim(ctx context.Context, warrantyID, userID uuid.UUID, req *dto.CreateWarrantyClaimRequest) (*dto.WarrantyClaimResponse, error) {
	warranty, err := s.warrantyRepo.GetByID(ctx, warrantyID)
	if err != nil {
		return nil, appErrors.NotFound("warranty")
	}

	if !warranty.IsValid() {
		return nil, appErrors.BadRequest("Bảo hành đã hết hạn")
	}

	now := time.Now()
	claimNumber := fmt.Sprintf("CLM-%s-%d", now.Format("20060102"), now.UnixMilli()%100000)

	claim := &model.WarrantyClaim{
		ID:           uuid.New(),
		WarrantyID:   warrantyID,
		StoreID:      warranty.StoreID,
		ClaimNumber:  claimNumber,
		Issue:        req.Issue,
		Description:  req.Description,
		Status:       model.ClaimStatusPending,
		Images:       model.StringArr(req.Images),
		CreatedBy:    userID,
		ReceivedDate: &now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.warrantyRepo.CreateClaim(ctx, claim); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to create warranty claim: %w", err))
	}

	// Notify store users about new warranty claim
	if s.notifSvc != nil {
		go s.notifSvc.NotifyStoreUsers(context.Background(), warranty.StoreID,
			"warranty_request",
			"Yêu cầu bảo hành mới",
			fmt.Sprintf("Yêu cầu %s - %s: %s", claimNumber, warranty.WarrantyCode, req.Issue),
			"info",
			map[string]interface{}{
				"claim_id":      claim.ID.String(),
				"claim_number":  claimNumber,
				"warranty_id":   warrantyID.String(),
				"warranty_code": warranty.WarrantyCode,
				"issue":         req.Issue,
			},
		)
	}

	return toWarrantyClaimResponse(claim), nil
}

func (s *warrantyService) UpdateClaim(ctx context.Context, claimID uuid.UUID, req *dto.UpdateWarrantyClaimRequest) (*dto.WarrantyClaimResponse, error) {
	claim := &model.WarrantyClaim{
		ID:        claimID,
		UpdatedAt: time.Now(),
	}

	if req.Status != "" {
		claim.Status = req.Status
	}
	if req.Resolution != "" {
		claim.Resolution = req.Resolution
	}
	if req.TechnicianNotes != "" {
		claim.TechnicianNotes = req.TechnicianNotes
	}

	now := time.Now()
	if req.Status == model.ClaimStatusCompleted {
		claim.CompletedDate = &now
	}
	if req.Status == model.ClaimStatusReturned {
		claim.ReturnedDate = &now
	}

	if err := s.warrantyRepo.UpdateClaim(ctx, claim); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update warranty claim: %w", err))
	}

	return toWarrantyClaimResponse(claim), nil
}

func (s *warrantyService) CheckWarranty(ctx context.Context, code string) (*dto.WarrantyResponse, error) {
	return s.GetByCode(ctx, code)
}

func (s *warrantyService) PublicLookup(ctx context.Context, query string) ([]dto.PublicWarrantyResponse, error) {
	var allWarranties []model.Warranty

	// Try warranty code
	if w, err := s.warrantyRepo.GetByCode(ctx, query); err == nil {
		allWarranties = append(allWarranties, *w)
	}

	// Try serial number
	if results, err := s.warrantyRepo.GetBySerialNumber(ctx, query); err == nil {
		allWarranties = appendUnique(allWarranties, results)
	}

	// Try customer phone
	if results, err := s.warrantyRepo.GetByCustomerPhone(ctx, query); err == nil {
		allWarranties = appendUnique(allWarranties, results)
	}

	var responses []dto.PublicWarrantyResponse
	for i := range allWarranties {
		w := &allWarranties[i]
		claims, _ := s.warrantyRepo.GetClaimsByWarrantyID(ctx, w.ID)

		resp := toPublicWarrantyResponse(w, claims)
		// Populate customer name (masked phone)
		if customer, err := s.warrantyRepo.GetCustomerByID(ctx, w.CustomerID); err == nil {
			resp.CustomerName = customer.FullName
			if len(customer.Phone) > 6 {
				resp.CustomerPhone = customer.Phone[:4] + "****" + customer.Phone[len(customer.Phone)-2:]
			} else {
				resp.CustomerPhone = customer.Phone
			}
		}
		// Populate product & variant names
		if variant, err := s.warrantyRepo.GetVariantByID(ctx, w.ProductVariantID); err == nil {
			resp.VariantName = variant.Name
			resp.ProductName = variant.SKU
		}
		responses = append(responses, *resp)
	}
	return responses, nil
}

func (s *warrantyService) GetClaimByID(ctx context.Context, claimID uuid.UUID) (*dto.WarrantyClaimResponse, error) {
	claim, err := s.warrantyRepo.GetClaimByID(ctx, claimID)
	if err != nil {
		return nil, appErrors.NotFound("warranty claim")
	}
	return toWarrantyClaimResponse(claim), nil
}

func (s *warrantyService) UpdateClaimStatus(ctx context.Context, claimID uuid.UUID, status string) (*dto.WarrantyClaimResponse, error) {
	claim, err := s.warrantyRepo.GetClaimByID(ctx, claimID)
	if err != nil {
		return nil, appErrors.NotFound("warranty claim")
	}

	if !isValidClaimTransition(claim.Status, status) {
		return nil, appErrors.BadRequest(fmt.Sprintf("Không thể chuyển từ trạng thái '%s' sang '%s'", claim.Status, status))
	}

	claim.Status = status
	claim.UpdatedAt = time.Now()

	now := time.Now()
	switch status {
	case model.ClaimStatusReceived:
		claim.ReceivedDate = &now
	case model.ClaimStatusCompleted:
		claim.CompletedDate = &now
	case model.ClaimStatusReturned:
		claim.ReturnedDate = &now
	}

	if err := s.warrantyRepo.UpdateClaim(ctx, claim); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to update claim status: %w", err))
	}
	return toWarrantyClaimResponse(claim), nil
}

func (s *warrantyService) ReturnClaim(ctx context.Context, claimID uuid.UUID, notes string) (*dto.WarrantyClaimResponse, error) {
	claim, err := s.warrantyRepo.GetClaimByID(ctx, claimID)
	if err != nil {
		return nil, appErrors.NotFound("warranty claim")
	}

	if claim.Status != model.ClaimStatusCompleted {
		return nil, appErrors.BadRequest("Chỉ có thể trả máy sau khi hoàn thành sửa chữa")
	}

	now := time.Now()
	claim.Status = model.ClaimStatusReturned
	claim.ReturnedDate = &now
	if notes != "" {
		claim.TechnicianNotes = claim.TechnicianNotes + "\n[Trả máy] " + notes
	}
	claim.UpdatedAt = now

	if err := s.warrantyRepo.UpdateClaim(ctx, claim); err != nil {
		return nil, appErrors.Internal(fmt.Errorf("failed to return claim: %w", err))
	}
	return toWarrantyClaimResponse(claim), nil
}

// populateWarrantyRelations loads customer and product variant data into the response
func (s *warrantyService) populateWarrantyRelations(ctx context.Context, resp *dto.WarrantyResponse, w *model.Warranty) {
	if customer, err := s.warrantyRepo.GetCustomerByID(ctx, w.CustomerID); err == nil {
		resp.Customer = &dto.CustomerResponse{
			ID:       customer.ID,
			StoreID:  customer.StoreID,
			FullName: customer.FullName,
			Phone:    customer.Phone,
			Email:    customer.Email,
		}
	}
	if variant, err := s.warrantyRepo.GetVariantByID(ctx, w.ProductVariantID); err == nil {
		resp.ProductVariant = &dto.VariantResponse{
			ID:           variant.ID,
			ProductID:    variant.ProductID,
			SKU:          variant.SKU,
			Barcode:      variant.Barcode,
			Name:         variant.Name,
			SellingPrice: variant.SellingPrice,
		}
	}
}

// appendUnique adds warranties to the slice only if not already present by ID
func appendUnique(existing []model.Warranty, additions []model.Warranty) []model.Warranty {
	seen := make(map[uuid.UUID]bool)
	for _, w := range existing {
		seen[w.ID] = true
	}
	for _, w := range additions {
		if !seen[w.ID] {
			existing = append(existing, w)
			seen[w.ID] = true
		}
	}
	return existing
}

// isValidClaimTransition checks if a status transition is valid
func isValidClaimTransition(from, to string) bool {
	transitions := map[string][]string{
		model.ClaimStatusPending:    {model.ClaimStatusReceived, model.ClaimStatusRejected},
		model.ClaimStatusReceived:   {model.ClaimStatusProcessing, model.ClaimStatusRejected},
		model.ClaimStatusProcessing: {model.ClaimStatusCompleted, model.ClaimStatusRejected},
		model.ClaimStatusCompleted:  {model.ClaimStatusReturned},
		model.ClaimStatusRejected:   {model.ClaimStatusReturned},
	}
	allowed, ok := transitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

func toWarrantyResponse(w *model.Warranty, claims []model.WarrantyClaim) *dto.WarrantyResponse {
	// Compute display status dynamically
	displayStatus := w.Status
	daysRemaining := w.DaysRemaining()
	if w.Status == model.WarrantyStatusActive {
		if time.Now().After(w.EndDate) {
			displayStatus = "expired"
			daysRemaining = 0
		} else if daysRemaining <= 30 {
			displayStatus = "expiring"
		}
	}

	resp := &dto.WarrantyResponse{
		ID:             w.ID,
		StoreID:        w.StoreID,
		WarrantyCode:   w.WarrantyCode,
		SerialNumber:   w.SerialNumber,
		StartDate:      w.StartDate,
		EndDate:        w.EndDate,
		WarrantyMonths: w.WarrantyMonths,
		Status:         displayStatus,
		DaysRemaining:  daysRemaining,
		Terms:          w.Terms,
		Notes:          w.Notes,
		CreatedAt:      w.CreatedAt,
	}

	if claims != nil {
		for i := range claims {
			resp.Claims = append(resp.Claims, *toWarrantyClaimResponse(&claims[i]))
		}
	}

	return resp
}

func toWarrantyClaimResponse(c *model.WarrantyClaim) *dto.WarrantyClaimResponse {
	return &dto.WarrantyClaimResponse{
		ID:              c.ID,
		WarrantyID:      c.WarrantyID,
		ClaimNumber:     c.ClaimNumber,
		Issue:           c.Issue,
		Description:     c.Description,
		Status:          c.Status,
		Resolution:      c.Resolution,
		TechnicianNotes: c.TechnicianNotes,
		ReceivedDate:    c.ReceivedDate,
		CompletedDate:   c.CompletedDate,
		ReturnedDate:    c.ReturnedDate,
		Images:          []string(c.Images),
		CreatedAt:       c.CreatedAt,
	}
}

func toPublicWarrantyResponse(w *model.Warranty, claims []model.WarrantyClaim) *dto.PublicWarrantyResponse {
	displayStatus := w.Status
	daysRemaining := w.DaysRemaining()
	if w.Status == model.WarrantyStatusActive {
		if time.Now().After(w.EndDate) {
			displayStatus = "expired"
			daysRemaining = 0
		} else if daysRemaining <= 30 {
			displayStatus = "expiring"
		}
	}

	resp := &dto.PublicWarrantyResponse{
		WarrantyCode:   w.WarrantyCode,
		SerialNumber:   w.SerialNumber,
		StartDate:      w.StartDate,
		EndDate:        w.EndDate,
		WarrantyMonths: w.WarrantyMonths,
		Status:         displayStatus,
		DaysRemaining:  daysRemaining,
		Terms:          w.Terms,
	}

	if claims != nil {
		for i := range claims {
			resp.Claims = append(resp.Claims, dto.PublicWarrantyClaimResponse{
				ClaimNumber:   claims[i].ClaimNumber,
				Issue:         claims[i].Issue,
				Status:        claims[i].Status,
				Resolution:    claims[i].Resolution,
				ReceivedDate:  claims[i].ReceivedDate,
				CompletedDate: claims[i].CompletedDate,
				ReturnedDate:  claims[i].ReturnedDate,
				CreatedAt:     claims[i].CreatedAt,
			})
		}
	}

	return resp
}
