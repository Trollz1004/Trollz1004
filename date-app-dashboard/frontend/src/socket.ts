import { io } from 'socket.io-client';
import { useAuthStore } from './store/authStore';

const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export const socket = io(URL, {
  autoConnect: false,
  auth: (cb) => {
    cb({ token: useAuthStore.getState().token });
  },
});
