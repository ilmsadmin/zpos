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

type POSSessionHandler struct {
	posService service.POSSessionService
	validate   *validator.CustomValidator
}

func NewPOSSessionHandler(posService service.POSSessionService, validate *validator.CustomValidator) *POSSessionHandler {
	return &POSSessionHandler{
		posService: posService,
		validate:   validate,
	}
}

// Open godoc
// @Summary Open a POS session (cash register shift)
// @Tags POS
// @Accept json
// @Produce json
// @Param body body dto.OpenPOSSessionRequest true "Opening data"
// @Success 201 {object} dto.POSSessionResponse
// @Security BearerAuth
// @Router /api/v1/pos/sessions/open [post]
func (h *POSSessionHandler) Open(c *fiber.Ctx) error {
	var req dto.OpenPOSSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	claims := middleware.GetClaims(c)
	storeID := middleware.GetStoreID(c)

	result, err := h.posService.Open(c.Context(), storeID, claims.UserID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Created(c, result, "POS session opened")
}

// Close godoc
// @Summary Close a POS session
// @Tags POS
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Param body body dto.ClosePOSSessionRequest true "Closing data"
// @Success 200 {object} dto.POSSessionResponse
// @Security BearerAuth
// @Router /api/v1/pos/sessions/{id}/close [post]
func (h *POSSessionHandler) Close(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid session ID"))
	}

	var req dto.ClosePOSSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, appErrors.BadRequest("Invalid request body"))
	}
	if err := h.validate.Validate(&req); err != nil {
		return response.ErrorFromErr(c, err)
	}

	result, err := h.posService.Close(c.Context(), sessionID, &req)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result, "POS session closed")
}

// GetCurrent godoc
// @Summary Get current open POS session
// @Tags POS
// @Produce json
// @Success 200 {object} dto.POSSessionResponse
// @Security BearerAuth
// @Router /api/v1/pos/sessions/current [get]
func (h *POSSessionHandler) GetCurrent(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	storeID := middleware.GetStoreID(c)

	result, err := h.posService.GetCurrent(c.Context(), storeID, claims.UserID)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Success(c, result)
}

// List godoc
// @Summary List POS sessions
// @Tags POS
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Success 200 {array} dto.POSSessionResponse
// @Security BearerAuth
// @Router /api/v1/pos/sessions [get]
func (h *POSSessionHandler) List(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	storeID := middleware.GetStoreID(c)
	sessions, total, err := h.posService.List(c.Context(), storeID, page, limit)
	if err != nil {
		return response.ErrorFromErr(c, err)
	}
	return response.Paginated(c, sessions, page, limit, total)
}
