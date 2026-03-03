package validator

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	appErrors "github.com/zplus/pos/pkg/errors"
)

var (
	phoneRegex   = regexp.MustCompile(`^(\+84|0)[0-9]{9,10}$`)
	barcodeRegex = regexp.MustCompile(`^[A-Za-z0-9\-]+$`)
	skuRegex     = regexp.MustCompile(`^[A-Z0-9\-_]+$`)
)

type CustomValidator struct {
	validate *validator.Validate
}

func New() *CustomValidator {
	v := validator.New()

	// Register custom validations
	_ = v.RegisterValidation("phone_vn", validatePhoneVN)
	_ = v.RegisterValidation("barcode", validateBarcode)
	_ = v.RegisterValidation("sku", validateSKU)
	_ = v.RegisterValidation("password_strength", validatePasswordStrength)

	return &CustomValidator{validate: v}
}

// Validate validates a struct and returns AppError with field details
func (cv *CustomValidator) Validate(i interface{}) error {
	if err := cv.validate.Struct(i); err != nil {
		var fieldErrors []appErrors.FieldError

		for _, e := range err.(validator.ValidationErrors) {
			fieldErrors = append(fieldErrors, appErrors.FieldError{
				Field:   toSnakeCase(e.Field()),
				Message: formatValidationMessage(e),
			})
		}

		return appErrors.ValidationError(fieldErrors)
	}
	return nil
}

// Custom validation functions

func validatePhoneVN(fl validator.FieldLevel) bool {
	return phoneRegex.MatchString(fl.Field().String())
}

func validateBarcode(fl validator.FieldLevel) bool {
	return barcodeRegex.MatchString(fl.Field().String())
}

func validateSKU(fl validator.FieldLevel) bool {
	return skuRegex.MatchString(fl.Field().String())
}

func validatePasswordStrength(fl validator.FieldLevel) bool {
	password := fl.Field().String()
	if len(password) < 8 {
		return false
	}
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)
	return hasUpper && hasLower && hasDigit
}

// formatValidationMessage returns a human-readable validation message
func formatValidationMessage(e validator.FieldError) string {
	field := toSnakeCase(e.Field())
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", field, e.Param())
	case "max":
		return fmt.Sprintf("%s must not exceed %s characters", field, e.Param())
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, e.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", field, e.Param())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, e.Param())
	case "uuid":
		return fmt.Sprintf("%s must be a valid UUID", field)
	case "phone_vn":
		return fmt.Sprintf("%s must be a valid Vietnamese phone number", field)
	case "barcode":
		return fmt.Sprintf("%s must be a valid barcode", field)
	case "sku":
		return fmt.Sprintf("%s must be a valid SKU (uppercase alphanumeric with hyphens)", field)
	case "password_strength":
		return fmt.Sprintf("%s must be at least 8 characters with uppercase, lowercase, and digit", field)
	case "url":
		return fmt.Sprintf("%s must be a valid URL", field)
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}

// toSnakeCase converts CamelCase to snake_case
func toSnakeCase(s string) string {
	var result strings.Builder
	for i, r := range s {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteByte('_')
		}
		result.WriteRune(r)
	}
	return strings.ToLower(result.String())
}
