const { Server } = require('socket.io');
const { socketAuth } = require('../middleware/auth');
const Message = require('../models/Message');
const Room = require('../models/Room');

// Tracks which rooms have online users, for presence counts.
// Map<roomId, Set<username>>
const presence = new Map();

function addPresence(roomId, username) {
  if (!presence.has(roomId)) presence.set(roomId, new Set());
  presence.get(roomId).add(username);
  return presence.get(roomId).size;
}

function removePresence(roomId, username) {
  if (!presence.has(roomId)) return 0;
  presence.get(roomId).delete(username);
  return presence.get(roomId).size;
}

function initChatSocket(httpServer, clientOrigin) {
  const io = new Server(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const { username } = socket.user;
    console.log(`[socket] ${username} connected (${socket.id})`);

    let currentRoom = null;

    socket.on('room:join', async ({ roomName }, ack) => {
      try {
        const room = await Room.findOne({ name: roomName.toLowerCase() });
        if (!room) return ack?.({ ok: false, error: 'Room does not exist' });

        if (currentRoom) {
          socket.leave(currentRoom.id);
          const remaining = removePresence(currentRoom.id, username);
          io.to(currentRoom.id).emit('presence:update', { count: remaining });
        }

        socket.join(room.id);
        currentRoom = room;

        const count = addPresence(room.id, username);
        io.to(room.id).emit('presence:update', { count });
        socket.to(room.id).emit('system:message', {
          text: `${username} joined the room`,
          at: new Date().toISOString(),
        });

        ack?.({ ok: true, room: { id: room.id, name: room.name } });
      } catch (err) {
        console.error('[socket] room:join error', err.message);
        ack?.({ ok: false, error: 'Failed to join room' });
      }
    });

    socket.on('message:send', async ({ text }, ack) => {
      try {
        if (!currentRoom) return ack?.({ ok: false, error: 'Join a room first' });
        if (!text || !text.trim()) return ack?.({ ok: false, error: 'Empty message' });

        const message = await Message.create({
          room: currentRoom.id,
          sender: socket.user.id,
          senderUsername: username,
          text: text.trim().slice(0, 2000),
        });

        const payload = {
          id: message._id,
          roomId: currentRoom.id,
          sender: username,
          text: message.text,
          createdAt: message.createdAt,
        };

        // Broadcast to everyone in the room, including sender, so all
        // clients render from a single source of truth.
        io.to(currentRoom.id).emit('message:new', payload);
        ack?.({ ok: true });
      } catch (err) {
        console.error('[socket] message:send error', err.message);
        ack?.({ ok: false, error: 'Failed to send message' });
      }
    });

    socket.on('typing:start', () => {
      if (currentRoom) socket.to(currentRoom.id).emit('typing:update', { username, typing: true });
    });

    socket.on('typing:stop', () => {
      if (currentRoom) socket.to(currentRoom.id).emit('typing:update', { username, typing: false });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] ${username} disconnected (${socket.id})`);
      if (currentRoom) {
        const remaining = removePresence(currentRoom.id, username);
        io.to(currentRoom.id).emit('presence:update', { count: remaining });
        socket.to(currentRoom.id).emit('system:message', {
          text: `${username} left the room`,
          at: new Date().toISOString(),
        });
      }
    });
  });

  return io;
}

module.exports = initChatSocket;
