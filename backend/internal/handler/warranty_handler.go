package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/middleware"
	"github.com/zplus/pos/internal/service"
	"github.com/zplus/pos/internal/validator"
	appErrors "github.com/zplus/pos/pkg/errors"
	"github.com/zplus/pos/pkg/response"
)

type WarrantyHandler struct {
	warrantyService service.WarrantyService
	validate        *validator.CustomValidator
}

func NewWarrantyHandler(warrantyService service.WarrantyService, validate *validator.CustomValidator) *WarrantyHandler {
	return &WarrantyHandler{
		warrantyService: warrantyService,
		validate:        validate,
	}
}

// List godoc
// @Summary List warranties
// @Tags Warranties
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Param status query string false "Filter by status"
// @Param search query string false "Search term"
// @Success 200 {array} dto.WarrantyResponse
// @Security BearerAuth
// @Router /api/v1/warranties [get]
func (h *WarrantyHandler) List(c *fiber.Ctx) error {
	var params dto.WarrantyListParams
	if err := c.QueryParser(&params); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid query parameters"))
	}

	storeID := middleware.GetStoreID(c)
	warranties, total, err := h.warrantyService.List(c.Context(), storeID, &params)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}
	return response.Paginated(c, warranties, page, limit, total)
}

// GetByID godoc
// @Summary Get warranty by ID
// @Tags Warranties
// @Produce json
// @Param id path string true "Warranty ID"
// @Success 200 {object} dto.WarrantyResponse
// @Security BearerAuth
// @Router /api/v1/warranties/{id} [get]
func (h *WarrantyHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid warranty ID"))
	}

	result, err := h.warrantyService.GetByID(c.Context(), id)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Lookup godoc
// @Summary Lookup warranty by code, serial, phone, or order number
// @Tags Warranties
// @Produce json
// @Param q query string true "Warranty code, serial number, phone, or order number"
// @Success 200 {array} dto.WarrantyResponse
// @Security BearerAuth
// @Router /api/v1/warranties/lookup [get]
func (h *WarrantyHandler) Lookup(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return response.Error(c, appErrors.BadRequest("Search query is required"))
	}

	results, err := h.warrantyService.Lookup(c.Context(), query)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, results)
}

// GetExpiring godoc
// @Summary Get expiring warranties
// @Tags Warranties
// @Produce json
// @Param days query int false "Days until expiration (default 30)"
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Success 200 {array} dto.WarrantyResponse
// @Security BearerAuth
// @Router /api/v1/warranties/expiring [get]
func (h *WarrantyHandler) GetExpiring(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	days := c.QueryInt("days", 30)
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	warranties, total, err := h.warrantyService.GetExpiring(c.Context(), storeID, days, page, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, warranties, page, limit, total)
}

// CountActiveClaims godoc
// @Summary Count active warranty claims
// @Tags Warranties
// @Produce json
// @Success 200 {object} map[string]int64
// @Security BearerAuth
// @Router /api/v1/warranties/claims-count [get]
func (h *WarrantyHandler) CountActiveClaims(c *fiber.Ctx) error {
	storeID := middleware.GetStoreID(c)
	count, err := h.warrantyService.CountActiveClaims(c.Context(), storeID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, fiber.Map{"active_claims": count})
}

// GetClaimByID godoc
// @Summary Get warranty claim by ID
// @Tags Warranties
// @Produce json
// @Param claim_id path string true "Claim ID"
// @Success 200 {object} dto.WarrantyClaimResponse
// @Security BearerAuth
// @Router /api/v1/warranty-claims/{claim_id} [get]
func (h *WarrantyHandler) GetClaimByID(c *fiber.Ctx) error {
	claimID, err := uuid.Parse(c.Params("claim_id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid claim ID"))
	}

	result, err := h.warrantyService.GetClaimByID(c.Context(), claimID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// UpdateClaimStatus godoc
// @Summary Update warranty claim status
// @Tags Warranties
// @Accept json
// @Produce json
// @Param claim_id path string true "Claim ID"
// @Param body body dto.UpdateClaimStatusRequest true "Status update"
// @Success 200 {object} dto.WarrantyClaimResponse
// @Security BearerAuth
// @Router /api/v1/warranty-claims/{claim_id}/status [put]
func (h *WarrantyHandler) UpdateClaimStatus(c *fiber.Ctx) error {
	claimID, err := uuid.Parse(c.Params("claim_id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid claim ID"))
	}

	var req dto.UpdateClaimStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.warrantyService.UpdateClaimStatus(c.Context(), claimID, req.Status)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// ReturnClaim godoc
// @Summary Return device to customer after warranty claim
// @Tags Warranties
// @Accept json
// @Produce json
// @Param claim_id path string true "Claim ID"
// @Param body body dto.ReturnClaimRequest true "Return notes"
// @Success 200 {object} dto.WarrantyClaimResponse
// @Security BearerAuth
// @Router /api/v1/warranty-claims/{claim_id}/return [post]
func (h *WarrantyHandler) ReturnClaim(c *fiber.Ctx) error {
	claimID, err := uuid.Parse(c.Params("claim_id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid claim ID"))
	}

	var req dto.ReturnClaimRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}

	result, err := h.warrantyService.ReturnClaim(c.Context(), claimID, req.Notes)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// CreateClaim godoc
// @Summary Create a warranty claim
// @Tags Warranties
// @Accept json
// @Produce json
// @Param id path string true "Warranty ID"
// @Param body body dto.CreateWarrantyClaimRequest true "Claim data"
// @Success 201 {object} dto.WarrantyClaimResponse
// @Security BearerAuth
// @Router /api/v1/warranties/{id}/claims [post]
func (h *WarrantyHandler) CreateClaim(c *fiber.Ctx) error {
	warrantyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid warranty ID"))
	}

	var req dto.CreateWarrantyClaimRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	claims := middleware.GetClaims(c)
	result, err := h.warrantyService.CreateClaim(c.Context(), warrantyID, claims.UserID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

// UpdateClaim godoc
// @Summary Update a warranty claim
// @Tags Warranties
// @Accept json
// @Produce json
// @Param claim_id path string true "Claim ID"
// @Param body body dto.UpdateWarrantyClaimRequest true "Claim update data"
// @Success 200 {object} dto.WarrantyClaimResponse
// @Security BearerAuth
// @Router /api/v1/warranty-claims/{claim_id} [put]
func (h *WarrantyHandler) UpdateClaim(c *fiber.Ctx) error {
	claimID, err := uuid.Parse(c.Params("claim_id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid claim ID"))
	}

	var req dto.UpdateWarrantyClaimRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.warrantyService.UpdateClaim(c.Context(), claimID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Create godoc
// @Summary Create a new warranty
// @Tags Warranties
// @Accept json
// @Produce json
// @Param body body dto.CreateWarrantyRequest true "Warranty data"
// @Success 201 {object} dto.WarrantyResponse
// @Security BearerAuth
// @Router /api/v1/warranties [post]
func (h *WarrantyHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateWarrantyRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	storeID := middleware.GetStoreID(c)
	result, err := h.warrantyService.Create(c.Context(), storeID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result)
}

// Update godoc
// @Summary Update a warranty
// @Tags Warranties
// @Accept json
// @Produce json
// @Param id path string true "Warranty ID"
// @Param body body dto.UpdateWarrantyRequest true "Warranty update data"
// @Success 200 {object} dto.WarrantyResponse
// @Security BearerAuth
// @Router /api/v1/warranties/{id} [put]
func (h *WarrantyHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid warranty ID"))
	}

	var req dto.UpdateWarrantyRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}

	result, err := h.warrantyService.Update(c.Context(), id, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// Void godoc
// @Summary Void a warranty
// @Tags Warranties
// @Param id path string true "Warranty ID"
// @Success 200
// @Security BearerAuth
// @Router /api/v1/warranties/{id}/void [post]
func (h *WarrantyHandler) Void(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid warranty ID"))
	}

	if err := h.warrantyService.Void(c.Context(), id); err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, nil, "Warranty voided successfully")
}
