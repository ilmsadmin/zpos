package response

import (
	"time"

	"github.com/gofiber/fiber/v2"
	appErrors "github.com/zplus/pos/pkg/errors"
)

type Response struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Message   string      `json:"message,omitempty"`
	Timestamp string      `json:"timestamp"`
}

type PaginatedResponse struct {
	Success    bool        `json:"success"`
	Data       interface{} `json:"data"`
	Pagination *Pagination `json:"pagination"`
	Timestamp  string      `json:"timestamp"`
}

type ErrorResponse struct {
	Success   bool      `json:"success"`
	Error     ErrorBody `json:"error"`
	Timestamp string    `json:"timestamp"`
}

type ErrorBody struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details []appErrors.FieldError `json:"details,omitempty"`
}

type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

// Success sends a success response
func Success(c *fiber.Ctx, data interface{}, message ...string) error {
	msg := "Success"
	if len(message) > 0 {
		msg = message[0]
	}
	return c.JSON(Response{
		Success:   true,
		Data:      data,
		Message:   msg,
		Timestamp: now(),
	})
}

// Created sends a 201 created response
func Created(c *fiber.Ctx, data interface{}, message ...string) error {
	msg := "Created successfully"
	if len(message) > 0 {
		msg = message[0]
	}
	return c.Status(fiber.StatusCreated).JSON(Response{
		Success:   true,
		Data:      data,
		Message:   msg,
		Timestamp: now(),
	})
}

// Paginated sends a paginated response
func Paginated(c *fiber.Ctx, data interface{}, page, limit int, total int64) error {
	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return c.JSON(PaginatedResponse{
		Success: true,
		Data:    data,
		Pagination: &Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
			HasNext:    page < totalPages,
			HasPrev:    page > 1,
		},
		Timestamp: now(),
	})
}

// NoContent sends a 204 response
func NoContent(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

// Error sends an error response
func Error(c *fiber.Ctx, err *appErrors.AppError) error {
	return c.Status(err.StatusCode).JSON(ErrorResponse{
		Success: false,
		Error: ErrorBody{
			Code:    err.Code,
			Message: err.Message,
			Details: err.Details,
		},
		Timestamp: now(),
	})
}

// ErrorFromErr converts a generic error to an error response
func ErrorFromErr(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*appErrors.AppError); ok {
		return Error(c, appErr)
	}
	return Error(c, appErrors.Internal(err))
}
