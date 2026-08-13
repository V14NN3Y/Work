"use client";

import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import type { CartItem } from "@/types";

const STORAGE_KEY = "ecommerce_cart_v1";

type CartState = { items: CartItem[]; promoCode: string | null; discountAmount: number };

type CartAction =
  | { type: "ADD_ITEM"; item: CartItem }
  | { type: "UPDATE_QTY"; productId: string; quantity: number }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "APPLY_PROMO"; code: string; discountAmount: number }
  | { type: "CLEAR_PROMO" };

// Cart items changing invalidates any applied discount (it may depend on subtotal via
// min_order_amount, or on which products are in the cart) — force re-validation instead of
// silently showing a stale discount.
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, items: action.items };
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.productId === action.item.productId);
      if (existing) {
        const maxQty = existing.stockQuantity;
        const nextQty = Math.min(existing.quantity + action.item.quantity, maxQty);
        return {
          ...state,
          items: state.items.map((i) => (i.productId === action.item.productId ? { ...i, quantity: nextQty } : i)),
          promoCode: null,
          discountAmount: 0,
        };
      }
      return { ...state, items: [...state.items, action.item], promoCode: null, discountAmount: 0 };
    }
    case "UPDATE_QTY": {
      const clamped = Math.max(1, action.quantity);
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.productId ? { ...i, quantity: Math.min(clamped, i.stockQuantity) } : i
        ),
        promoCode: null,
        discountAmount: 0,
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.productId !== action.productId),
        promoCode: null,
        discountAmount: 0,
      };
    case "CLEAR_CART":
      return { ...state, items: [], promoCode: null, discountAmount: 0 };
    case "APPLY_PROMO":
      return { ...state, promoCode: action.code, discountAmount: action.discountAmount };
    case "CLEAR_PROMO":
      return { ...state, promoCode: null, discountAmount: 0 };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  promoCode: string | null;
  discountAmount: number;
  finalAmount: number;
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  applyPromo: (code: string, discountAmount: number) => void;
  clearPromo: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], promoCode: null, discountAmount: 0 });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        dispatch({ type: "HYDRATE", items: JSON.parse(raw) });
      } catch {
        // ignore corrupted cart data
      }
    }
    setHydrated(true);
  }, []);

  // Guarded by `hydrated` (a state flag, not a ref) so this never fires with the reducer's
  // pre-hydration [] state — otherwise, under React Strict Mode's dev-only double-effect
  // invocation, this write can race the hydration read above and clobber a real cart with [].
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items, hydrated]);

  const totalAmount = state.items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

  const value: CartContextValue = {
    items: state.items,
    itemCount,
    totalAmount,
    promoCode: state.promoCode,
    discountAmount: state.discountAmount,
    finalAmount: Math.max(0, totalAmount - state.discountAmount),
    addItem: (item) => dispatch({ type: "ADD_ITEM", item }),
    updateQuantity: (productId, quantity) => dispatch({ type: "UPDATE_QTY", productId, quantity }),
    removeItem: (productId) => dispatch({ type: "REMOVE_ITEM", productId }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }),
    applyPromo: (code, discountAmount) => dispatch({ type: "APPLY_PROMO", code, discountAmount }),
    clearPromo: () => dispatch({ type: "CLEAR_PROMO" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
