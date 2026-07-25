const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getLogs } = require('../utils/logger');
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', async (req, res) => {
    try { const { type, startDate, endDate, limit, offset } = req.query; const logs = await getLogs({ type, startDate, endDate, limit: parseInt(limit) || 20, offset: parseInt(offset) || 0 }); const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM logs'); res.json({ success: true, logs, total }); } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;