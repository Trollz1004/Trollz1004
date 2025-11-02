import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/axios';
import { Button, Card, CardContent, Typography, Avatar, TextField, Box } from '@mui/material';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      const { data } = await apiClient.post('/api/profile/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUser({ ...user, avatar: data.avatarUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Your Profile</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Avatar src={user?.avatar} sx={{ width: 100, height: 100, mr: 2 }} />
          <Box>
            <Typography variant="h6">{user?.displayName}</Typography>
            <Typography variant="body1">{user?.email}</Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Update Profile</Typography>
          <TextField
            label="Display Name"
            variant="outlined"
            fullWidth
            margin="normal"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input type="file" onChange={handleFileChange} />
          <Button variant="contained" onClick={handleAvatarUpload} sx={{ mt: 2 }}>
            Upload Avatar
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
