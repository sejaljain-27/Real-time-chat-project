const express = require('express');
const { listRooms, createRoom, getRoomHistory } = require('../controllers/roomController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listRooms);
router.post('/', requireAuth, createRoom);
router.get('/:roomId/messages', requireAuth, getRoomHistory);

module.exports = router;
