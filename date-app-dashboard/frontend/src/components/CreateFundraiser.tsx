import React, { useState } from 'react';
import { Button, TextField, Card, CardContent, Typography, Box } from '@mui/material';
import apiClient from '../api/axios';

export default function CreateFundraiser() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState(0);

  const handleCreateFundraiser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/fundraiser/create', { title, description, goal });
      // Redirect to the fundraiser page or show a success message
    } catch (error) {
      console.error('Error creating fundraiser:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Create a new Fundraiser</Typography>
        <Box component="form" onSubmit={handleCreateFundraiser} sx={{ mt: 2 }}>
          <TextField
            label="Title"
            variant="outlined"
            fullWidth
            margin="normal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <TextField
            label="Description"
            variant="outlined"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <TextField
            label="Goal (in USD)"
            type="number"
            variant="outlined"
            fullWidth
            margin="normal"
            value={goal}
            onChange={(e) => setGoal(parseInt(e.target.value))}
            required
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Create Fundraiser
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
