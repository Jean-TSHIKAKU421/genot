const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../db');
const { log, LOG_TYPES } = require('../utils/logger');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

const storage = multer.diskStorage({
    destination: (req, file, cb) => { const m = req.body.user_matricule || 'temp'; const d = path.join(__dirname, '..', '..', 'uploads', m, 'images'); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); cb(null, d); },
    filename: (req, file, cb) => { cb(null, `temp-${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/:matricule', async (req, res) => {
    try { const [courses] = await pool.query('SELECT * FROM courses WHERE user_matricule = ? AND deleted_at IS NULL AND hidden = 0 ORDER BY created_at DESC', [req.params.matricule]); const [allNotes] = await pool.query('SELECT n.* FROM notes n JOIN courses c ON n.course_id = c.id WHERE c.user_matricule = ? AND n.deleted_at IS NULL AND n.hidden = 0', [req.params.matricule]); for (let c of courses) c.noteCount = allNotes.filter(n => n.course_id === c.id).length; res.json({ success: true, courses, allNotes }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/', (req, res) => { upload.single('image')(req, res, async (err) => {
    try { const { title, user_matricule, professor, description, image_url } = req.body; let imageUrl = image_url || null; if (req.file && !imageUrl) { const ct = title.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase(), ext = path.extname(req.file.originalname); const dir = path.join(__dirname, '..', '..', 'uploads', user_matricule, 'images'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); const p = path.join(dir, `${ct}${ext}`); if (fs.existsSync(p)) fs.unlinkSync(p); fs.renameSync(req.file.path, p); imageUrl = `/uploads/${user_matricule}/images/${ct}${ext}`; } if (!title || !user_matricule) return res.status(400).json({ success: false }); const [result] = await pool.query('INSERT INTO courses (user_matricule, title, image_url, professor, description) VALUES (?,?,?,?,?)', [user_matricule, title, imageUrl, professor||null, description||null]); const [course] = await pool.query('SELECT * FROM courses WHERE id = ?', [result.insertId]); log(LOG_TYPES.COURSE_CREATE, req.user?.id, req.ip, `Cours "${title}" créé`); res.status(201).json({ success: true, course: course[0] }); } catch (err) { res.status(500).json({ success: false }); }
})});

router.put('/:id', (req, res) => { upload.single('image')(req, res, async (err) => {
    try { const { title, professor, description, image_url } = req.body; const [old] = await pool.query('SELECT * FROM courses WHERE id = ? AND deleted_at IS NULL', [req.params.id]); if (old.length === 0) return res.status(404).json({ success: false }); const updates = [], values = []; if (title !== undefined) { updates.push('title = ?'); values.push(title); } if (professor !== undefined) { updates.push('professor = ?'); values.push(professor||null); } if (description !== undefined) { updates.push('description = ?'); values.push(description||null); } if (image_url !== undefined) { updates.push('image_url = ?'); values.push(image_url || null); } else if (req.file) { if (old[0].image_url) { const op = path.join(__dirname, '..', '..', old[0].image_url); if (fs.existsSync(op)) fs.unlinkSync(op); } const ct = (title || old[0].title).replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase(), ext = path.extname(req.file.originalname); const dir = path.join(__dirname, '..', '..', 'uploads', old[0].user_matricule, 'images'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); const p = path.join(dir, `${ct}${ext}`); if (fs.existsSync(p)) fs.unlinkSync(p); fs.renameSync(req.file.path, p); updates.push('image_url = ?'); values.push(`/uploads/${old[0].user_matricule}/images/${ct}${ext}`); } if (updates.length === 0) return res.status(400).json({ success: false }); values.push(req.params.id); await pool.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, values); const [updated] = await pool.query('SELECT * FROM courses WHERE id = ?', [req.params.id]); log(LOG_TYPES.COURSE_UPDATE, req.user?.id, req.ip, `Cours #${req.params.id} modifié`); res.json({ success: true, course: updated[0] }); } catch (err) { res.status(500).json({ success: false }); }
})});

router.delete('/:id', async (req, res) => {
    try { await pool.query('UPDATE courses SET deleted_at = NOW() WHERE id = ?', [req.params.id]); await pool.query('UPDATE notes SET deleted_at = NOW() WHERE course_id = ?', [req.params.id]); log(LOG_TYPES.COURSE_DELETE, req.user?.id, req.ip, `Cours #${req.params.id} supprimé`); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/detail/:id', async (req, res) => {
    try { const [course] = await pool.query('SELECT * FROM courses WHERE id = ? AND deleted_at IS NULL', [req.params.id]); if (course.length === 0) return res.status(404).json({ success: false }); const [notes] = await pool.query('SELECT * FROM notes WHERE course_id = ? AND deleted_at IS NULL AND hidden = 0 ORDER BY created_at DESC', [req.params.id]); res.json({ success: true, course: course[0], notes }); } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;