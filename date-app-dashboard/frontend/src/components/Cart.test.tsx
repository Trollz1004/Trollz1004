import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '../store/authStore';
import Cart from './Cart';

// Mock the auth store
const mockCart = [
  { id: '1', name: 'Product 1', price: 1000, quantity: 1, description: '' },
  { id: '2', name: 'Product 2', price: 2000, quantity: 2, description: '' },
];

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

describe('Cart', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      cart: mockCart,
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      user: { displayName: 'Test User' },
      token: 'test-token',
      setToken: jest.fn(),
      setUser: jest.fn(),
      logout: jest.fn(),
      addToCart: jest.fn(),
    });
  });

  it('renders the cart with items and total', () => {
    render(<Cart />);

    expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText(/Total: \$50.00/)).toBeInTheDocument();
  });
});
