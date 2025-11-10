import React, { useState } from 'react';
import { Button, TextField, Card, CardContent, Typography, Box } from '@mui/material';
import apiClient from '../api/axios';

export default function Marketing() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/marketing/send-newsletter', { subject, body });
      // Show a success message
    } catch (error) {
      console.error('Error sending newsletter:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Send Newsletter</Typography>
        <Box component="form" onSubmit={handleSendNewsletter} sx={{ mt: 2 }}>
          <TextField
            label="Subject"
            variant="outlined"
            fullWidth
            margin="normal"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <TextField
            label="Body"
            variant="outlined"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Send Newsletter
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}