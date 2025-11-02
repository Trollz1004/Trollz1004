import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface AuthState {
  token: string | null;
  user: any | null; // You should define a proper user type
  cart: CartItem[];
  setToken: (token: string) => void;
  setUser: (user: any) => void;
  logout: () => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      cart: [],
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null, cart: [] }),
      addToCart: (product) =>
        set((state) => {
          const existingProduct = state.cart.find((item) => item.id === product.id);
          if (existingProduct) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              ),
            };
          }
          return { cart: [...state.cart, { ...product, quantity: 1 }] };
        }),
      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== productId),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    { name: 'auth-storage' } // Local storage key
  )
);
