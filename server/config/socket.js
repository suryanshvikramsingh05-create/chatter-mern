const { Server } = require('socket.io');
const User = require('../models/User');

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
    },
  });

  // Tracks how many sockets (tabs/devices) each user currently has open,
  // so presence only flips to "offline" once their last connection drops.
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    let currentUserId = null;

    socket.on('setup', (userId) => {
      currentUserId = userId;
      socket.join(userId);

      const count = onlineUsers.get(userId) || 0;
      onlineUsers.set(userId, count + 1);

      if (count === 0) {
        io.emit('user online', userId);
      }

      socket.emit('online users', Array.from(onlineUsers.keys()));
      socket.emit('connected');
    });

    socket.on('join chat', (chatId) => {
      socket.join(chatId);
    });

    socket.on('typing', (chatId) => socket.to(chatId).emit('typing', chatId));
    socket.on('stop typing', (chatId) => socket.to(chatId).emit('stop typing', chatId));

    socket.on('new message', (message) => {
      const chat = message.chat;
      if (!chat?.users) return;

      chat.users.forEach((user) => {
        if (user._id === message.sender._id) return;
        socket.to(user._id).emit('message received', message);
      });
    });

    socket.on('disconnect', async () => {
      if (!currentUserId) return;

      const count = onlineUsers.get(currentUserId) || 0;
      if (count <= 1) {
        onlineUsers.delete(currentUserId);
        const lastSeen = new Date();
        io.emit('user offline', { userId: currentUserId, lastSeen });
        try {
          await User.findByIdAndUpdate(currentUserId, { lastSeen });
        } catch {
          // best-effort; presence still broadcast even if this write fails
        }
      } else {
        onlineUsers.set(currentUserId, count - 1);
      }
    });
  });

  return io;
};

module.exports = initSocket;
