package utils

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// --- Slug Generator ---

var (
	nonAlphaNum = regexp.MustCompile(`[^a-z0-9\s-]`)
	spaces      = regexp.MustCompile(`[\s-]+`)
)

// GenerateSlug creates a URL-friendly slug from a string
func GenerateSlug(s string) string {
	s = strings.ToLower(s)
	s = removeVietnameseDiacritics(s)
	s = nonAlphaNum.ReplaceAllString(s, "")
	s = spaces.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

// --- Pagination ---

type PaginationParams struct {
	Page  int `query:"page"`
	Limit int `query:"limit"`
}

type PaginationResult struct {
	Page       int
	Limit      int
	Offset     int
	Total      int64
	TotalPages int
}

// NormalizePagination normalizes pagination parameters
func NormalizePagination(page, limit int) PaginationResult {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return PaginationResult{
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
}

func (p *PaginationResult) SetTotal(total int64) {
	p.Total = total
	p.TotalPages = int(math.Ceil(float64(total) / float64(p.Limit)))
}

// --- Barcode Generator ---

// GenerateBarcode generates an EAN-13 compatible barcode
func GenerateBarcode(prefix string) string {
	timestamp := time.Now().UnixNano() / int64(time.Millisecond)
	code := fmt.Sprintf("%s%012d", prefix, timestamp%1000000000000)
	if len(code) > 12 {
		code = code[:12]
	}
	// Calculate check digit for EAN-13
	checkDigit := calculateEAN13CheckDigit(code)
	return code + strconv.Itoa(checkDigit)
}

func calculateEAN13CheckDigit(code string) int {
	sum := 0
	for i, r := range code {
		digit := int(r - '0')
		if i%2 == 0 {
			sum += digit
		} else {
			sum += digit * 3
		}
	}
	return (10 - (sum % 10)) % 10
}

// --- Order Number Generator ---

// GenerateOrderNumber creates a unique order number
// Format: ORD-{YYYYMMDD}-{StoreCode}-{Sequence}
func GenerateOrderNumber(storeCode string, sequence int64) string {
	date := time.Now().Format("20060102")
	return fmt.Sprintf("ORD-%s-%s-%04d", date, strings.ToUpper(storeCode), sequence)
}

// GenerateInvoiceNumber creates a unique invoice number
func GenerateInvoiceNumber(storeCode string, sequence int64) string {
	date := time.Now().Format("20060102")
	return fmt.Sprintf("INV-%s-%s-%04d", date, strings.ToUpper(storeCode), sequence)
}

// GeneratePurchaseOrderNumber creates a PO number
func GeneratePurchaseOrderNumber(storeCode string, sequence int64) string {
	date := time.Now().Format("20060102")
	return fmt.Sprintf("PO-%s-%s-%04d", date, strings.ToUpper(storeCode), sequence)
}

// GenerateWarrantyCode creates a warranty code
func GenerateWarrantyCode(storeCode string, sequence int64) string {
	date := time.Now().Format("20060102")
	return fmt.Sprintf("WR-%s-%s-%04d", date, strings.ToUpper(storeCode), sequence)
}

// GenerateSKU creates a SKU from category and product name
func GenerateSKU(categoryCode, productName string, variantIndex int) string {
	slug := strings.ToUpper(GenerateSlug(productName))
	if len(slug) > 10 {
		slug = slug[:10]
	}
	return fmt.Sprintf("%s-%s-%03d", strings.ToUpper(categoryCode), slug, variantIndex)
}

// --- Vietnamese Diacritics Removal ---

var vietnameseReplacements = map[rune]rune{
	'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
	'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
	'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
	'đ': 'd',
	'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
	'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
	'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
	'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
	'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
	'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
	'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
	'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
	'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
}

func removeVietnameseDiacritics(s string) string {
	s = norm.NFC.String(s)
	var result strings.Builder
	for _, r := range s {
		if replacement, ok := vietnameseReplacements[r]; ok {
			result.WriteRune(replacement)
		} else if replacement, ok := vietnameseReplacements[unicode.ToLower(r)]; ok {
			result.WriteRune(unicode.ToUpper(replacement))
		} else {
			result.WriteRune(r)
		}
	}
	return result.String()
}

// --- Misc Helpers ---

// FormatCurrency formats a number as Vietnamese Dong currency
func FormatCurrency(amount float64) string {
	whole := int64(amount)
	s := strconv.FormatInt(whole, 10)
	// Add thousand separators
	var result strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result.WriteByte('.')
		}
		result.WriteRune(c)
	}
	return result.String() + "₫"
}

// TruncateString truncates a string to the given max length
func TruncateString(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen]) + "..."
}

// StringPtr returns a pointer to a string
func StringPtr(s string) *string { return &s }

// IntPtr returns a pointer to an int
func IntPtr(i int) *int { return &i }

// Float64Ptr returns a pointer to a float64
func Float64Ptr(f float64) *float64 { return &f }

// BoolPtr returns a pointer to a bool
func BoolPtr(b bool) *bool { return &b }
