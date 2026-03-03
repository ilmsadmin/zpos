package errors

import (
	"fmt"
	"net/http"
)

type AppError struct {
	Code       string       `json:"code"`
	Message    string       `json:"message"`
	StatusCode int          `json:"-"`
	Details    []FieldError `json:"details,omitempty"`
	Err        error        `json:"-"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (%s)", e.Code, e.Message, e.Err.Error())
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// Common error constructors

func BadRequest(message string) *AppError {
	return &AppError{
		Code:       "BAD_REQUEST",
		Message:    message,
		StatusCode: http.StatusBadRequest,
	}
}

func ValidationError(details []FieldError) *AppError {
	return &AppError{
		Code:       "VALIDATION_ERROR",
		Message:    "Invalid input data",
		StatusCode: http.StatusBadRequest,
		Details:    details,
	}
}

func Unauthorized(message string) *AppError {
	if message == "" {
		message = "Unauthorized"
	}
	return &AppError{
		Code:       "UNAUTHORIZED",
		Message:    message,
		StatusCode: http.StatusUnauthorized,
	}
}

func TokenExpired() *AppError {
	return &AppError{
		Code:       "TOKEN_EXPIRED",
		Message:    "Access token has expired",
		StatusCode: http.StatusUnauthorized,
	}
}

func Forbidden(message string) *AppError {
	if message == "" {
		message = "You don't have permission to access this resource"
	}
	return &AppError{
		Code:       "FORBIDDEN",
		Message:    message,
		StatusCode: http.StatusForbidden,
	}
}

func NotFound(resource string) *AppError {
	return &AppError{
		Code:       "NOT_FOUND",
		Message:    fmt.Sprintf("%s not found", resource),
		StatusCode: http.StatusNotFound,
	}
}

func Conflict(message string) *AppError {
	return &AppError{
		Code:       "CONFLICT",
		Message:    message,
		StatusCode: http.StatusConflict,
	}
}

func Unprocessable(message string) *AppError {
	return &AppError{
		Code:       "UNPROCESSABLE",
		Message:    message,
		StatusCode: http.StatusUnprocessableEntity,
	}
}

func RateLimited() *AppError {
	return &AppError{
		Code:       "RATE_LIMITED",
		Message:    "Too many requests, please try again later",
		StatusCode: http.StatusTooManyRequests,
	}
}

func Internal(err error) *AppError {
	return &AppError{
		Code:       "INTERNAL_ERROR",
		Message:    "An internal error occurred",
		StatusCode: http.StatusInternalServerError,
		Err:        err,
	}
}
