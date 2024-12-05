import { create } from "zustand";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { persist } from "zustand/middleware";

export const useCartStore = create(
  persist(
    (set, get) => ({
      cart: [],
      coupon: null,
      total: 0,
      subTotal: 0,

      // Fetch cart items from backend
      getCartItems: async () => {
        try {
          const res = await axios('/cart');
          set({ cart: res.data });
          get().calculateTotals();
        } catch (error) {
          set({ cart: [] });
          toast.error(error.response?.data?.error || "An error occurred");
        }
      },

      // Add product to cart
      addToCart: async (product) => {
        try {
          await axios.post("/cart", { productId: product._id });
          toast.success("Added to cart");
          
          set((prevState) => {
            const existingItem = prevState.cart.find((item) => item._id === product._id);
            const newCart = existingItem
              ? prevState.cart.map((item) =>
                  item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                )
              : [...prevState.cart, { ...product, quantity: 1 }];
            return { cart: newCart };
          });

          get().calculateTotals();
        } catch (error) {
          toast.error(error.response?.data?.error || "An error occurred");
        }
      },

      // Calculate totals for cart
      calculateTotals: () => {
        const { cart, coupon } = get();
        const subTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const total = coupon ? subTotal - (subTotal * coupon.discount) / 100 : subTotal;
        set({ subTotal, total });
      },

      // Clear the cart
      clearCart: () => {
        set({ cart: [] });
        get().calculateTotals();
      },

      // Set coupon
      applyCoupon: (coupon) => {
        set({ coupon });
        get().calculateTotals();
      },
    }),
    {
      name: "cart-storage", // Key for localStorage
      getStorage: () => localStorage, // Persist in localStorage
    }
  )
);
