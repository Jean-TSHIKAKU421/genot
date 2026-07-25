const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/:matricule', async (req, res) => {
    try { const [courses] = await pool.query('SELECT * FROM courses WHERE user_matricule = ? AND hidden = 1 AND deleted_at IS NULL', [req.params.matricule]); const [notes] = await pool.query('SELECT n.*, c.title as course_title FROM notes n JOIN courses c ON n.course_id = c.id WHERE n.hidden = 1 AND n.deleted_at IS NULL AND c.deleted_at IS NULL AND c.user_matricule = ?', [req.params.matricule]); res.json({ success: true, courses, notes }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/setup', async (req, res) => {
    try { const { matricule, password } = req.body; if (!password || password.length < 4) return res.status(400).json({ success: false, message: 'Mot de passe minimum 4 caractères.' }); await pool.query('UPDATE users SET vault_password = ?, vault_active = 1 WHERE matricule = ?', [password, matricule]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/verify', async (req, res) => {
    try { const { matricule, password } = req.body; const [r] = await pool.query('SELECT vault_password, vault_active FROM users WHERE matricule = ?', [matricule]); if (r.length === 0 || !r[0].vault_active) return res.json({ success: false, message: 'Coffre-fort non configuré.' }); if (r[0].vault_password === password) res.json({ success: true }); else res.json({ success: false, message: 'Mot de passe incorrect.' }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/disable', async (req, res) => {
    try { const { matricule } = req.body; await pool.query('UPDATE courses SET hidden = 0 WHERE user_matricule = ?', [matricule]); await pool.query('UPDATE notes SET hidden = 0 WHERE course_id IN (SELECT id FROM courses WHERE user_matricule = ?)', [matricule]); await pool.query('UPDATE users SET vault_active = 0, vault_password = NULL WHERE matricule = ?', [matricule]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;