const express = require('express');
const router = express.Router();
const pool = require('../db');
const { log, LOG_TYPES } = require('../utils/logger');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', async (req, res) => {
    try { const { course_id, title, content, type, file_url } = req.body; const [result] = await pool.query('INSERT INTO notes (course_id, title, content, file_url, type) VALUES (?,?,?,?,?)', [course_id, title, content||'', file_url||null, type||'note']); const [note] = await pool.query('SELECT * FROM notes WHERE id = ?', [result.insertId]); log(LOG_TYPES.NOTE_CREATE, req.user?.id, req.ip, `Note "${title}" créée`); res.status(201).json({ success: true, note: note[0] }); } catch (err) { res.status(500).json({ success: false }); }
});

router.put('/:id', async (req, res) => {
    try { const { title, content } = req.body; const updates = [], values = []; if (title !== undefined) { updates.push('title = ?'); values.push(title); } if (content !== undefined) { updates.push('content = ?'); values.push(content); } if (updates.length === 0) return res.status(400).json({ success: false }); values.push(req.params.id); await pool.query(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, values); const [updated] = await pool.query('SELECT * FROM notes WHERE id = ?', [req.params.id]); log(LOG_TYPES.NOTE_UPDATE, req.user?.id, req.ip, `Note #${req.params.id} modifiée`); res.json({ success: true, note: updated[0] }); } catch (err) { res.status(500).json({ success: false }); }
});

router.delete('/:id', async (req, res) => {
    try { await pool.query('UPDATE notes SET deleted_at = NOW() WHERE id = ?', [req.params.id]); log(LOG_TYPES.NOTE_DELETE, req.user?.id, req.ip, `Note #${req.params.id} supprimée`); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;