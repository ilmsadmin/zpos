import { create } from "zustand";
import type {
  CreateOrderItemRequest,
  CreatePaymentRequest,
  CustomerResponse,
} from "@/types/api";

export interface CartItem extends CreateOrderItemRequest {
  product_name: string;
  variant_name: string;
  sku: string;
  image?: string;
  available_qty: number;
}

interface POSState {
  // Cart
  items: CartItem[];
  customer: CustomerResponse | null;
  discountType: "percentage" | "fixed" | null;
  discountValue: number;
  notes: string;
  payments: CreatePaymentRequest[];

  // Computed
  subTotal: number;
  discountAmount: number;
  totalAmount: number;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  setCustomer: (customer: CustomerResponse | null) => void;
  setDiscount: (type: "percentage" | "fixed" | null, value: number) => void;
  setNotes: (notes: string) => void;
  addPayment: (payment: CreatePaymentRequest) => void;
  removePayment: (index: number) => void;
  clearCart: () => void;
  recalculate: () => void;
}

const calculateTotals = (
  items: CartItem[],
  discountType: "percentage" | "fixed" | null,
  discountValue: number
) => {
  const subTotal = items.reduce((sum, item) => {
    const itemDiscount =
      item.discount_type === "percentage"
        ? item.unit_price * item.quantity * ((item.discount_value || 0) / 100)
        : item.discount_value || 0;
    return sum + item.unit_price * item.quantity - itemDiscount;
  }, 0);

  let discountAmount = 0;
  if (discountType === "percentage") {
    discountAmount = subTotal * (discountValue / 100);
  } else if (discountType === "fixed") {
    discountAmount = discountValue;
  }

  const totalAmount = Math.max(0, subTotal - discountAmount);

  return { subTotal, discountAmount, totalAmount };
};

export const usePOSStore = create<POSState>((set, get) => ({
  items: [],
  customer: null,
  discountType: null,
  discountValue: 0,
  notes: "",
  payments: [],
  subTotal: 0,
  discountAmount: 0,
  totalAmount: 0,

  addItem: (item) => {
    const { items } = get();
    const existing = items.find(
      (i) => i.product_variant_id === item.product_variant_id
    );

    // Enforce stock limit
    const currentQty = existing ? existing.quantity : 0;
    const maxQty = item.available_qty;
    if (maxQty > 0 && currentQty + item.quantity > maxQty) {
      // Cannot exceed available stock
      return;
    }

    let newItems: CartItem[];
    if (existing) {
      newItems = items.map((i) =>
        i.product_variant_id === item.product_variant_id
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
    } else {
      newItems = [...items, item];
    }

    const totals = calculateTotals(newItems, get().discountType, get().discountValue);
    set({ items: newItems, ...totals });
  },

  removeItem: (variantId) => {
    const newItems = get().items.filter((i) => i.product_variant_id !== variantId);
    const totals = calculateTotals(newItems, get().discountType, get().discountValue);
    set({ items: newItems, ...totals });
  },

  updateQuantity: (variantId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(variantId);
      return;
    }
    // Enforce stock limit
    const item = get().items.find((i) => i.product_variant_id === variantId);
    if (item && item.available_qty > 0 && quantity > item.available_qty) {
      return;
    }
    const newItems = get().items.map((i) =>
      i.product_variant_id === variantId ? { ...i, quantity } : i
    );
    const totals = calculateTotals(newItems, get().discountType, get().discountValue);
    set({ items: newItems, ...totals });
  },

  setCustomer: (customer) => set({ customer }),

  setDiscount: (type, value) => {
    const totals = calculateTotals(get().items, type, value);
    set({ discountType: type, discountValue: value, ...totals });
  },

  setNotes: (notes) => set({ notes }),

  addPayment: (payment) =>
    set((state) => ({ payments: [...state.payments, payment] })),

  removePayment: (index) =>
    set((state) => ({
      payments: state.payments.filter((_, i) => i !== index),
    })),

  clearCart: () =>
    set({
      items: [],
      customer: null,
      discountType: null,
      discountValue: 0,
      notes: "",
      payments: [],
      subTotal: 0,
      discountAmount: 0,
      totalAmount: 0,
    }),

  recalculate: () => {
    const totals = calculateTotals(get().items, get().discountType, get().discountValue);
    set(totals);
  },
}));
