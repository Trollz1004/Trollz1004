import React from 'react';
import { useAuthStore } from '../store/authStore';
import { Button, Card, CardContent, Typography, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../api/axios';

export default function Cart() {
  const { cart, removeFromCart, clearCart, user } = useAuthStore();

  const handleCheckout = async () => {
    if (!user) {
      alert('Please log in to check out.');
      return;
    }

    try {
      const { data } = await apiClient.post('/api/shop/create-payment-link', { cart });
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating payment link:', error);
      alert('There was an error creating the payment link. Please try again later.');
    }
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Shopping Cart</Typography>
        {cart.length === 0 ? (
          <Typography sx={{ mt: 2 }}>Your cart is empty.</Typography>
        ) : (
          <>
            <List sx={{ mt: 2 }}>
              {cart.map((item) => (
                <ListItem
                  key={item.id}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => removeFromCart(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={item.name}
                    secondary={`$${(item.price / 100).toFixed(2)} x ${item.quantity}`}
                  />
                </ListItem>
              ))}
            </List>
            <Typography variant="h6" sx={{ mt: 2 }}>
              Total: ${(total / 100).toFixed(2)}
            </Typography>
            <Button variant="contained" onClick={handleCheckout} sx={{ mt: 2 }}>
              Checkout
            </Button>
            <Button onClick={clearCart} sx={{ mt: 2, ml: 2 }}>
              Clear Cart
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
