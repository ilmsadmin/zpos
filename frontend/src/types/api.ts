// API types matching backend DTOs

// --- Auth ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// --- User ---
export interface UserResponse {
  id: string;
  store_id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  is_active: boolean;
  role?: RoleResponse;
  last_login_at: string | null;
  created_at: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role_id: string;
  is_active: boolean;
}

export interface UpdateUserRequest {
  full_name?: string;
  phone?: string;
  role_id?: string;
  is_active?: boolean;
}

// --- Role ---
export interface RoleResponse {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

// --- Store ---
export interface StoreResponse {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  is_active: boolean;
  settings: Record<string, unknown>;
}

// --- Product ---
export interface ProductResponse {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  unit: string;
  tags: string[];
  is_active: boolean;
  category?: CategoryResponse;
  variants: VariantResponse[];
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  category_id: string;
  name: string;
  description?: string;
  brand?: string;
  unit: string;
  tags?: string[];
  variants: CreateVariantRequest[];
}

export interface UpdateProductRequest {
  category_id?: string;
  name?: string;
  description?: string;
  brand?: string;
  unit?: string;
  tags?: string[];
  is_active?: boolean;
}

export interface VariantResponse {
  id: string;
  product_id: string;
  sku: string;
  barcode: string;
  name: string;
  cost_price: number;
  selling_price: number;
  compare_at_price: number | null;
  weight: number | null;
  attributes: Record<string, unknown>;
  images: string[];
  is_active: boolean;
  inventory?: InventoryResponse;
  created_at: string;
}

export interface CreateVariantRequest {
  sku?: string;
  barcode?: string;
  name: string;
  cost_price: number;
  selling_price: number;
  compare_at_price?: number;
  weight?: number;
  attributes?: Record<string, unknown>;
  images?: string[];
  initial_stock?: number;
}

export interface UpdateVariantRequest {
  sku?: string;
  barcode?: string;
  name?: string;
  cost_price?: number;
  selling_price?: number;
  compare_at_price?: number;
  weight?: number;
  attributes?: Record<string, unknown>;
  images?: string[];
  is_active?: boolean;
}

// --- Category ---
export interface CategoryResponse {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  children?: CategoryResponse[];
}

export interface CreateCategoryRequest {
  parent_id?: string;
  name: string;
  description?: string;
  image_url?: string;
  sort_order?: number;
}

// --- Inventory ---
export interface InventoryResponse {
  id: string;
  store_id: string;
  product_variant_id: string;
  quantity: number;
  reserved_qty: number;
  available_qty: number;
  min_stock_level: number;
  max_stock_level: number | null;
  location: string;
  is_low_stock: boolean;
}

export interface AdjustInventoryRequest {
  product_variant_id: string;
  quantity: number;
  type: "in" | "out" | "adjustment";
  reason: string;
  notes?: string;
}

// --- Order ---
export interface OrderResponse {
  id: string;
  store_id: string;
  customer_id: string | null;
  user_id: string;
  order_number: string;
  status: string;
  sub_total: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  notes: string;
  customer?: CustomerResponse;
  items: OrderItemResponse[];
  payments: PaymentResponse[];
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  customer_id?: string;
  pos_session_id?: string;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  notes?: string;
  items: CreateOrderItemRequest[];
  payments: CreatePaymentRequest[];
}

export interface CreateOrderItemRequest {
  product_variant_id: string;
  quantity: number;
  unit_price: number;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  warranty_months?: number;
  notes?: string;
}

export interface CreatePaymentRequest {
  method: "cash" | "card" | "transfer" | "momo" | "zalopay" | "vnpay";
  amount: number;
  transaction_id?: string;
  notes?: string;
}

export interface OrderItemResponse {
  id: string;
  product_variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  total_price: number;
  warranty_months: number;
}

export interface PaymentResponse {
  id: string;
  method: string;
  amount: number;
  status: string;
  transaction_id: string;
  paid_at: string | null;
}

// --- Customer ---
export interface CustomerResponse {
  id: string;
  store_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  date_of_birth: string | null;
  gender: string;
  total_spent: number;
  order_count: number;
  points: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

export interface CreateCustomerRequest {
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  notes?: string;
  tags?: string[];
}

// --- Warranty ---
export interface WarrantyResponse {
  id: string;
  store_id: string;
  warranty_code: string;
  serial_number: string;
  start_date: string;
  end_date: string;
  warranty_months: number;
  status: string;
  days_remaining: number;
  terms: string;
  notes: string;
  customer?: CustomerResponse;
  product_variant?: VariantResponse;
  claims?: WarrantyClaimResponse[];
  created_at: string;
}

export interface WarrantyClaimResponse {
  id: string;
  warranty_id: string;
  claim_number: string;
  issue: string;
  description: string;
  status: string;
  resolution: string;
  technician_notes: string;
  received_date: string | null;
  completed_date: string | null;
  returned_date: string | null;
  images: string[];
  created_at: string;
}

// --- API Response Wrappers ---
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
  timestamp: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
  timestamp: string;
}

// --- POS Session ---
export interface POSSessionResponse {
  id: string;
  store_id: string;
  user_id: string;
  user_name: string;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  total_sales: number;
  total_orders: number;
  status: string;
  notes: string;
  opened_at: string;
  closed_at: string | null;
}

// --- Supplier ---
export interface SupplierResponse {
  id: string;
  store_id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  tax_code: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_name?: string;
  phone: string;
  email?: string;
  address?: string;
  tax_code?: string;
  bank_account?: string;
  bank_name?: string;
  notes?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_code?: string;
  bank_account?: string;
  bank_name?: string;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateCategoryRequest {
  parent_id?: string;
  name?: string;
  description?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCustomerRequest {
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  notes?: string;
  tags?: string[];
  is_active?: boolean;
}

// --- Purchase Order ---
export interface PurchaseOrderResponse {
  id: string;
  store_id: string;
  supplier_id: string;
  po_number: string;
  order_number: string;
  status: string;
  total_amount: number;
  notes: string;
  expected_date: string | null;
  received_date: string | null;
  items: PurchaseOrderItemResponse[];
  supplier?: SupplierResponse;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItemResponse {
  id: string;
  product_variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  received_qty: number;
  unit_cost: number;
  unit_price: number;
  total_cost: number;
  total_price: number;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: string;
  notes?: string;
  items: CreatePurchaseOrderItemRequest[];
}

export interface CreatePurchaseOrderItemRequest {
  product_variant_id: string;
  quantity: number;
  unit_cost: number;
}

export interface UpdatePurchaseOrderRequest {
  notes?: string;
  items?: CreatePurchaseOrderItemRequest[];
}

export interface ReceivePurchaseOrderRequest {
  items: ReceivePurchaseOrderItemRequest[];
  notes?: string;
}

export interface ReceivePurchaseOrderItemRequest {
  purchase_order_item_id: string;
  received_qty: number;
}

// --- Stocktake ---
export interface StocktakeResponse {
  id: string;
  store_id: string;
  stocktake_number: string;
  status: string;
  notes: string;
  items: StocktakeItemResponse[];
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface StocktakeItemResponse {
  id: string;
  product_variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  system_qty: number;
  counted_qty: number;
  difference: number;
}

export interface CreateStocktakeRequest {
  notes?: string;
}

export interface AddStocktakeItemRequest {
  product_variant_id: string;
  counted_qty: number;
}

// --- Dashboard ---
export interface DashboardSummary {
  today_revenue: number;
  today_orders: number;
  today_customers: number;
  low_stock_count: number;
  month_revenue: number;
  month_orders: number;
  revenue_change: number;
  order_change: number;
  pending_warranty: number;
}

export interface SalesChartPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProductItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  revenue: number;
}

// --- Create Warranty ---
export interface CreateWarrantyRequest {
  order_item_id?: string;
  customer_id: string;
  product_variant_id: string;
  serial_number: string;
  warranty_months: number;
  terms?: string;
  notes?: string;
}

export interface CustomerPurchasedItemResponse {
  order_item_id: string;
  order_id: string;
  order_number: string;
  order_date: string;
  product_variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  warranty_months: number;
  has_warranty: boolean;
}

export interface UpdateWarrantyRequest {
  serial_number?: string;
  terms?: string;
  notes?: string;
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  display_name?: string;
  description?: string;
  permissions?: string[];
}
