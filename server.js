const express = require('express');
const path = require('path');
require('dotenv').config();
const pool = require('./public/server/db');
const { log, getLogs, LOG_TYPES } = require('./public/server/utils/logger');
const { authMiddleware } = require('./public/server/middleware/auth');
const { adminMiddleware } = require('./public/server/middleware/admin');
const { generateSecret, verifyTOTP, generateQRCode } = require('./public/server/utils/totp');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'genot_secret_key_2024';
const app = express();
const PORT = process.env.PORT || 8100;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function testConnection() { try { const c = await pool.getConnection(); console.log('✅ MySQL connecté'); c.release(); } catch (e) { console.error('❌ MySQL:', e.message); } }
testConnection();

// ==================== PAGES HTML ====================
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/', (req, res) => res.redirect('/login'));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/course', (req, res) => res.sendFile(path.join(__dirname, 'public', 'course.html')));
app.get('/trash', (req, res) => res.sendFile(path.join(__dirname, 'public', 'trash.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/vault', (req, res) => res.sendFile(path.join(__dirname, 'public', 'vault.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/api/ping', (req, res) => res.json({ success: true, message: 'pong' }));

// ==================== ROUTES API ====================
app.use('/api', require('./public/server/routes/auth'));
app.use('/api/courses', require('./public/server/routes/courses'));
app.use('/api/notes', require('./public/server/routes/notes'));
app.use('/api/trash', require('./public/server/routes/trash'));
app.use('/api/vault', require('./public/server/routes/vault'));
app.use('/api', require('./public/server/routes/profile'));
app.use('/api/admin', require('./public/server/routes/admin'));
app.use('/api/admin/logs', require('./public/server/routes/logs'));

// ==================== VISITS (public) ====================
app.post('/api/visits', async (req, res) => {
    try { const { platform, page, matricule } = req.body; const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0'; const today = new Date().toISOString().split('T')[0]; const [existing] = await pool.query('SELECT id FROM visits WHERE ip_address = ? AND platform = ? AND DATE(created_at) = ?', [ip, platform||'web', today]); if (existing.length === 0) await pool.query('INSERT INTO visits (platform, page, ip_address, user_agent, matricule) VALUES (?,?,?,?,?)', [platform||'web', page||'/', ip, req.headers['user-agent']||'', matricule||null]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.listen(PORT, () => { console.log(`🚀 GeNot prêt sur le port ${PORT}`); });