import React from 'react';
import { Grid, Typography } from '@mui/material';
import Shop from './Shop';
import Fundraiser from './Fundraiser';
import Marketing from './Marketing';
import Auth from './Auth';
import Cart from './Cart';

export default function Dashboard() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" component="h1" gutterBottom>
          Date App DAO Dashboard
        </Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <Auth />
      </Grid>
      <Grid item xs={12} md={6}>
        <Cart />
      </Grid>
      <Grid item xs={12}>
        <Shop />
      </Grid>
      <Grid item xs={12} md={6}>
        <Fundraiser />
      </Grid>
      <Grid item xs={12} md={6}>
        <Marketing />
      </Grid>
    </Grid>
  );
}