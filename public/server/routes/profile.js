const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../db');

const storage = multer.diskStorage({
    destination: (req, file, cb) => { const m = req.params.matricule || 'unknown'; const d = path.join(__dirname, '..', '..', 'uploads', m, 'images'); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); cb(null, d); },
    filename: (req, file, cb) => { cb(null, `profile-${req.params.matricule}-${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } });

router.put('/update-profile/:matricule', async (req, res) => {
    try { const { nom, email, photo } = req.body; const [u] = await pool.query('SELECT * FROM users WHERE matricule = ?', [req.params.matricule]); if (u.length === 0) return res.status(404).json({ success: false }); const updates = [], values = []; if (nom !== undefined) { updates.push('nom = ?'); values.push(nom); } if (email !== undefined) { if (email && email !== u[0].email) { const [e] = await pool.query('SELECT id FROM users WHERE email = ? AND matricule != ?', [email, req.params.matricule]); if (e.length > 0) return res.status(409).json({ success: false }); } updates.push('email = ?'); values.push(email || null); } if (photo !== undefined) { updates.push('photo = ?'); values.push(photo); } if (updates.length === 0) return res.status(400).json({ success: false }); values.push(req.params.matricule); await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE matricule = ?`, values); const [updated] = await pool.query('SELECT * FROM users WHERE matricule = ?', [req.params.matricule]); const { password: _, ...safe } = updated[0]; res.json({ success: true, user: safe }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/upload-profile-photo/:matricule', (req, res) => { upload.single('photo')(req, res, async (err) => { if (err || !req.file) return res.status(400).json({ success: false }); try { const [users] = await pool.query('SELECT photo FROM users WHERE matricule = ?', [req.params.matricule]); if (users[0]?.photo) { const p = path.join(__dirname, '..', '..', users[0].photo); if (fs.existsSync(p)) fs.unlinkSync(p); } const url = `/uploads/${req.params.matricule}/images/${req.file.filename}`; await pool.query('UPDATE users SET photo = ? WHERE matricule = ?', [url, req.params.matricule]); res.json({ success: true, photoUrl: url }); } catch (err) { res.status(500).json({ success: false }); } }); });

router.post('/save-theme', async (req, res) => {
    try { await pool.query('UPDATE users SET theme = ? WHERE matricule = ?', [req.body.theme, req.body.matricule]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/toggle-visibility/:type/:id', async (req, res) => {
    try { const { type, id } = req.params; if (type === 'course') { const [r] = await pool.query('SELECT hidden FROM courses WHERE id = ?', [id]); const nv = r[0]?.hidden ? 0 : 1; await pool.query('UPDATE courses SET hidden = ? WHERE id = ?', [nv, id]); res.json({ success: true, hidden: nv }); } else { const [r] = await pool.query('SELECT hidden FROM notes WHERE id = ?', [id]); const nv = r[0]?.hidden ? 0 : 1; await pool.query('UPDATE notes SET hidden = ? WHERE id = ?', [nv, id]); res.json({ success: true, hidden: nv }); } } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;