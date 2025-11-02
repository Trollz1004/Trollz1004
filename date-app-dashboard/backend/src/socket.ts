import { Server, Socket } from 'socket.io';
import http from 'http';
import logger from './logger';
import * as admin from 'firebase-admin';

let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      (socket as any).user = decodedToken;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`New client connected: ${socket.id}`);

    // Join a room with the user's UID
    const { uid } = (socket as any).user;
    socket.join(uid);

    socket.on('chat_message', (data) => {
      io.emit('chat_message', data);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
