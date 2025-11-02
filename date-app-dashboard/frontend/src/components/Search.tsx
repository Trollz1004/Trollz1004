import React, { useState } from 'react';
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import apiClient from '../api/axios';

interface SearchResults {
  products: any[];
  fundraisers: any[];
  users: any[];
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<SearchResults>({
    products: [],
    fundraisers: [],
    users: [],
  });
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params: any = { query, type };
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (category) params.category = category;

      const { data } = await apiClient.get('/api/search/search', { params });
      setResults(data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Advanced Search & Filter
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Search Query"
              variant="outlined"
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={type} onChange={(e) => setType(e.target.value)} label="Type">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="products">Products</MenuItem>
                <MenuItem value="fundraisers">Fundraisers</MenuItem>
                <MenuItem value="users">Users</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {(type === 'all' || type === 'products') && (
            <>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Min Price"
                  variant="outlined"
                  type="number"
                  fullWidth
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Max Price"
                  variant="outlined"
                  type="number"
                  fullWidth
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Category"
                  variant="outlined"
                  fullWidth
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
              fullWidth
            >
              Search
            </Button>
          </Grid>
        </Grid>

        {/* Results Display */}
        <Box>
          {results.products.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Products ({results.products.length})
              </Typography>
              <List>
                {results.products.map((product) => (
                  <ListItem key={product.id}>
                    <ListItemText
                      primary={product.name}
                      secondary={`$${product.price} - ${product.category || 'Uncategorized'}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {results.fundraisers.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Fundraisers ({results.fundraisers.length})
              </Typography>
              <List>
                {results.fundraisers.map((fundraiser) => (
                  <ListItem key={fundraiser.id}>
                    <ListItemText
                      primary={fundraiser.title}
                      secondary={`Goal: $${fundraiser.goal} - Raised: $${fundraiser.raised || 0}`}
                    />
                    <Chip label={fundraiser.status || 'Active'} color="primary" size="small" />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {results.users.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Users ({results.users.length})
              </Typography>
              <List>
                {results.users.map((user) => (
                  <ListItem key={user.id}>
                    <ListItemText
                      primary={user.displayName}
                      secondary={user.email}
                    />
                    <Chip label={user.role || 'user'} size="small" />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
