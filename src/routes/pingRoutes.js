const express = require('express');
const router = express.Router();
const pingAuth = require('../middlewares/pingAuthMiddleware');

// GET /api/ping
router.get('/', pingAuth, (req, res) => {
  res.json({ ok: true, message: 'pong', timestamp: Date.now() });
});

module.exports = router;
