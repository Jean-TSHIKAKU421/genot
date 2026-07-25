const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { log, LOG_TYPES } = require('../utils/logger');
const JWT_SECRET = process.env.JWT_SECRET || 'genot_secret_key_2024';

router.post('/register', async (req, res) => {
    try {
        const { nom, matricule, email, password, question1, reponse1, question2, reponse2 } = req.body;
        if (!nom || !matricule || !password || !question1 || !reponse1 || !question2 || !reponse2) return res.status(400).json({ success: false, message: 'Champs obligatoires manquants.' });
        const [e1] = await pool.query('SELECT id FROM users WHERE matricule = ?', [matricule]);
        if (e1.length > 0) return res.status(409).json({ success: false, message: 'Matricule existant.' });
        if (email) { const [e2] = await pool.query('SELECT id FROM users WHERE email = ?', [email]); if (e2.length > 0) return res.status(409).json({ success: false, message: 'Email existant.' }); }
        await pool.query('INSERT INTO users (nom, matricule, email, password, question1, reponse1, question2, reponse2) VALUES (?,?,?,?,?,?,?,?)', [nom, matricule, email||'', password, question1, reponse1, question2, reponse2]);
        const fs = require('fs'), path = require('path');
        const userDir = path.join(__dirname, '..', '..', 'uploads', matricule);
        ['images','pdfs','videos'].forEach(d => { const dir = path.join(userDir, d); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
        log(LOG_TYPES.LOGIN, null, req.ip, `Inscription: ${matricule}`);
        res.status(201).json({ success: true });
    } catch (err) { log(LOG_TYPES.ERROR, null, req.ip, err.message); res.status(500).json({ success: false }); }
});

router.post('/login', async (req, res) => {
    try {
        const { matricule, password } = req.body;
        if (!matricule || !password) return res.status(400).json({ success: false, message: 'Matricule et mot de passe requis.' });
        const [rows] = await pool.query('SELECT * FROM users WHERE matricule = ? AND password = ?', [matricule, password]);
        if (rows.length === 0) { log(LOG_TYPES.LOGIN_FAILED, null, req.ip, `Tentative: ${matricule}`); return res.status(401).json({ success: false, message: 'Identifiants incorrects.' }); }
        const user = rows[0];
        const token = jwt.sign({ id: user.id, matricule: user.matricule, nom: user.nom, role: user.matricule === '24AD421SI' ? 'admin' : 'user', adminSecret: user.admin_secret }, JWT_SECRET, { expiresIn: '30d' });
        const { password: _, admin_secret, ...safe } = user;
        log(LOG_TYPES.LOGIN, user.id, req.ip, `Connexion: ${matricule}`);
        res.json({ success: true, user: safe, token });
    } catch (err) { log(LOG_TYPES.ERROR, null, req.ip, err.message); res.status(500).json({ success: false }); }
});

router.get('/security-questions/:matricule', async (req, res) => {
    try { const [r] = await pool.query('SELECT question1, question2 FROM users WHERE matricule = ?', [req.params.matricule]); if (r.length === 0) return res.status(404).json({ success: false }); res.json({ success: true, question1: r[0].question1, question2: r[0].question2 }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/verify-security-answers', async (req, res) => {
    try { const { matricule, reponse1, reponse2 } = req.body; const [r] = await pool.query('SELECT reponse1, reponse2 FROM users WHERE matricule = ?', [matricule]); if (r[0].reponse1.toLowerCase() === reponse1.toLowerCase() && r[0].reponse2.toLowerCase() === reponse2.toLowerCase()) res.json({ success: true }); else res.status(400).json({ success: false, message: 'Réponses incorrectes.' }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/reset-password', async (req, res) => {
    try { const { matricule, newPassword } = req.body; if (!matricule || !newPassword) return res.status(400).json({ success: false }); if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Minimum 8 caractères.' }); await pool.query('UPDATE users SET password = ? WHERE matricule = ?', [newPassword, matricule]); log(LOG_TYPES.NOTE_UPDATE, null, req.ip, `Reset password: ${matricule}`); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;