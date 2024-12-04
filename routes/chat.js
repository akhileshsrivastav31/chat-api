const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// Get all messages for a specific room
router.get('/:room', async (req, res) => {
  try {
    const room = req.params.room;
    const messages = await Message.find({ room }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
