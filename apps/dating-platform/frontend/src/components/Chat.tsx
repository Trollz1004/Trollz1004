import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { socket } from '../socket';
import { TextField, Button, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';

interface Message {
  user: string;
  text: string;
}

export default function Chat() {
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    socket.on('chat_message', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      socket.off('chat_message');
    };
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && user) {
      socket.emit('chat_message', { user: user.displayName, text: message });
      setMessage('');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5">Chat</Typography>
      <List sx={{ height: 300, overflowY: 'auto', my: 2 }}>
        {messages.map((msg, index) => (
          <ListItem key={index}>
            <ListItemText primary={msg.text} secondary={msg.user} />
          </ListItem>
        ))}
      </List>
      <form onSubmit={handleSendMessage}>
        <TextField
          label="Message"
          variant="outlined"
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button type="submit" variant="contained" sx={{ mt: 1 }}>
          Send
        </Button>
      </form>
    </Paper>
  );
}
