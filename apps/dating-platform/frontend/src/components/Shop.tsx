import React, { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { Button, Card, CardContent, Typography, Grid, Box } from '@mui/material';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const { addToCart } = useAuthStore();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await apiClient.get('/api/shop/products');
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Shop</Typography>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {products.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{product.name}</Typography>
                  <Typography variant="body2">{product.description}</Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    ${(product.price / 100).toFixed(2)}
                  </Typography>
                  <Button variant="contained" onClick={() => addToCart(product)} sx={{ mt: 2 }}>
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}