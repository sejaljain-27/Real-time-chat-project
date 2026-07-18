const Room = require('../models/Room');
const Message = require('../models/Message');

async function listRooms(req, res) {
  const rooms = await Room.find().sort({ createdAt: 1 }).lean();
  return res.json({ rooms });
}

async function createRoom(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const room = await Room.create({
      name: name.toLowerCase().trim(),
      description: description || '',
      createdBy: req.user.id,
    });
    return res.status(201).json({ room });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Room already exists' });
    }
    console.error('[rooms] create error:', err.message);
    return res.status(500).json({ error: 'Could not create room' });
  }
}

// GET /api/rooms/:roomId/messages?before=<messageId>&limit=50
async function getRoomHistory(req, res) {
  const { roomId } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const before = req.query.before;

  const query = { room: roomId };
  if (before) {
    query._id = { $lt: before };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Return oldest-first for easy rendering
  return res.json({ messages: messages.reverse() });
}

module.exports = { listRooms, createRoom, getRoomHistory };
