import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  ageVerified: boolean;
  tosAcceptedAt: string | null;
  subscriptionTier: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginUserAgent: string | null;
  displayName?: string;
  avatar?: string;
  role?: 'admin' | 'user';
}

interface AuthState {
  token: string | null;
  user: User | null;
  cart: CartItem[];
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

const authStoreCreator: StateCreator<AuthState, [], []> = (
  set: (
    partial:
      | AuthState
      | Partial<AuthState>
      | ((state: AuthState) => AuthState | Partial<AuthState>),
    replace?: boolean
  ) => void
) => ({
  token: null,
  user: null,
  cart: [],
  setToken: (token: string) => set({ token }),
  setUser: (user: User) => set({ user }),
  logout: () => set({ token: null, user: null, cart: [] }),
  addToCart: (product: Product) =>
    set((state: AuthState) => {
      const existingProduct = state.cart.find((item: CartItem) => item.id === product.id);
      if (existingProduct) {
        return {
          cart: state.cart.map((item: CartItem) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return { cart: [...state.cart, { ...product, quantity: 1 }] };
    }),
  removeFromCart: (productId: string) =>
    set((state: AuthState) => ({
      cart: state.cart.filter((item: CartItem) => item.id !== productId),
    })),
  clearCart: () => set({ cart: [] }),
});

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(authStoreCreator, { name: 'auth-storage' })
);
