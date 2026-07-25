const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/:matricule', async (req, res) => {
    try { const [courses] = await pool.query('SELECT * FROM courses WHERE user_matricule = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC', [req.params.matricule]); const [notes] = await pool.query('SELECT n.*, c.title as course_title FROM notes n JOIN courses c ON n.course_id = c.id WHERE n.deleted_at IS NOT NULL AND c.user_matricule = ?', [req.params.matricule]); res.json({ success: true, courses, notes }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/restore/:type/:id', async (req, res) => {
    try { const { type, id } = req.params; if (type === 'course') { await pool.query('UPDATE courses SET deleted_at = NULL WHERE id = ?', [id]); await pool.query('UPDATE notes SET deleted_at = NULL WHERE course_id = ?', [id]); } else await pool.query('UPDATE notes SET deleted_at = NULL WHERE id = ?', [id]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

router.delete('/permanent/:type/:id', async (req, res) => {
    try { const { type, id } = req.params; if (type === 'course') { await pool.query('DELETE FROM notes WHERE course_id = ?', [id]); await pool.query('DELETE FROM courses WHERE id = ?', [id]); } else await pool.query('DELETE FROM notes WHERE id = ?', [id]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/empty/:matricule', async (req, res) => {
    try { await pool.query('DELETE FROM notes WHERE deleted_at IS NOT NULL AND course_id IN (SELECT id FROM courses WHERE user_matricule = ?)', [req.params.matricule]); await pool.query('DELETE FROM courses WHERE user_matricule = ? AND deleted_at IS NOT NULL', [req.params.matricule]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;