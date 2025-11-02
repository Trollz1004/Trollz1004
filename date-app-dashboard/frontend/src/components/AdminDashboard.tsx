import React, { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Card, CardContent, Typography, Grid } from '@mui/material';

interface AdminStats {
  users: number;
  products: number;
  fundraisers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await apiClient.get('/api/admin/stats');
        setStats(data);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Admin Dashboard</Typography>
        {stats && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Total Users</Typography>
                  <Typography variant="h4">{stats.users}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Total Products</Typography>
                  <Typography variant="h4">{stats.products}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Total Fundraisers</Typography>
                  <Typography variant="h4">{stats.fundraisers}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}
