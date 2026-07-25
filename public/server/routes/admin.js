const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const { generateSecret, verifyTOTP, generateQRCode } = require('../utils/totp');

router.use(authMiddleware);

router.post('/totp/setup', async (req, res) => {
    try { const { matricule } = req.body; const secret = generateSecret(); await pool.query('UPDATE users SET admin_secret = ?, totp_enabled = 1 WHERE matricule = ?', [secret, matricule]); const [user] = await pool.query('SELECT email FROM users WHERE matricule = ?', [matricule]); const qr = generateQRCode(secret, user[0]?.email || matricule); res.json({ success: true, secret, qr }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/totp/verify', async (req, res) => {
    try { const { matricule, token } = req.body; const [user] = await pool.query('SELECT admin_secret FROM users WHERE matricule = ?', [matricule]); if (!user[0]?.admin_secret) return res.json({ success: false, message: 'TOTP non configuré' }); res.json({ success: verifyTOTP(user[0].admin_secret, token) }); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/totp/disable', async (req, res) => {
    try { await pool.query('UPDATE users SET admin_secret = NULL, totp_enabled = 0 WHERE matricule = ?', [req.body.matricule]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/visits', adminMiddleware, async (req, res) => {
    try { const [[total]] = await pool.query('SELECT COUNT(*) as count FROM visits'); const [[today]] = await pool.query('SELECT COUNT(*) as count FROM visits WHERE DATE(created_at) = CURDATE()'); const [[week]] = await pool.query('SELECT COUNT(*) as count FROM visits WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'); const [platforms] = await pool.query('SELECT platform, COUNT(*) as count FROM visits GROUP BY platform'); res.json({ success: true, total: total.count, today: today.count, week: week.count, platforms }); } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/visits-monthly', adminMiddleware, async (req, res) => {
    try { const m = parseInt(req.query.month) || new Date().getMonth() + 1; const y = parseInt(req.query.year) || new Date().getFullYear(); const dim = new Date(y, m, 0).getDate(); const [daily] = await pool.query('SELECT DAY(created_at) as day, COUNT(*) as count FROM visits WHERE MONTH(created_at) = ? AND YEAR(created_at) = ? GROUP BY DAY(created_at) ORDER BY day', [m, y]); const data = []; for (let d = 1; d <= dim; d++) { const found = daily.find(r => r.day === d); data.push({ day: d, count: found ? found.count : 0 }); } res.json({ success: true, month: m, year: y, daysInMonth: dim, data }); } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/stats', adminMiddleware, async (req, res) => {
    try { const [[users]] = await pool.query('SELECT COUNT(*) as total FROM users'); const [[courses]] = await pool.query('SELECT COUNT(*) as total FROM courses WHERE deleted_at IS NULL'); const [[notes]] = await pool.query('SELECT COUNT(*) as total FROM notes WHERE deleted_at IS NULL'); const [[pdfs]] = await pool.query("SELECT COUNT(*) as total FROM notes WHERE type='support' AND deleted_at IS NULL"); const [[links]] = await pool.query("SELECT COUNT(*) as total FROM notes WHERE type='link' AND deleted_at IS NULL"); res.json({ success: true, stats: { users: users.total, courses: courses.total, notes: notes.total, pdfs: pdfs.total, links: links.total }}); } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/sql', adminMiddleware, async (req, res) => {
    try { const [rows] = await pool.query(req.body.query); res.json({ success: true, data: rows }); } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

module.exports = router;