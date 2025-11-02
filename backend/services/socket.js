const jwt = require('jsonwebtoken');
const { pool } = require('./db');

module.exports = (io) => {
  io.use((socket, next) => {
    if (socket.handshake.auth && socket.handshake.auth.token) {
      jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET, (err, user) => {
        if (err) return next(new Error('Authentication error'));
        socket.user = user;
        next();
      });
    } else {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('a user connected:', socket.user.userId);

    socket.on('send_message', async (data) => {
      const { matchId, content } = data;
      const senderId = socket.user.userId;
      
      try {
        await pool.query(
          'INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3)',
          [matchId, senderId, content]
        );
        // Broadcast to the other user in the match
        // This requires knowing the other user's socket id
      } catch (error) {
        console.error('Error saving message', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });
};
