const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const multer = require('multer');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3500;

// ==========================================
// CONFIGURATION MYSQL
// ==========================================
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestion_notes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CONFIGURATION MULTER (IMAGES COURS)
// ==========================================
const courseStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const matricule = req.body.user_matricule || 'temp';
        const uploadDir = path.join(__dirname, 'public', 'uploads', matricule, 'images');
        if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => { const ext = path.extname(file.originalname); cb(null, `temp-${Date.now()}${ext}`); }
});

const uploadCourse = multer({
    storage: courseStorage, limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) { cb(null, true); } else { cb(new Error('Type non autorisé.')); }
    }
});

// ==========================================
// CONFIGURATION MULTER (FICHIERS NOTES)
// ==========================================
const noteStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const matricule = req.body.user_matricule || 'unknown';
        const fileExt = path.extname(file.originalname).toLowerCase();
        let subFolder = 'pdfs';
        if (['.jpg','.jpeg','.png','.gif','.webp','.bmp'].includes(fileExt)) subFolder = 'images';
        else if (['.mp4','.avi','.mov','.mkv','.webm'].includes(fileExt)) subFolder = 'videos';
        const uploadDir = path.join(__dirname, 'public', 'uploads', matricule, subFolder);
        if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => { const ext = path.extname(file.originalname); cb(null, `note-${Date.now()}${ext}`); }
});

const uploadNote = multer({ storage: noteStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// ==========================================
// CONFIGURATION MULTER (PHOTOS PROFIL)
// ==========================================
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const matricule = req.params.matricule || 'unknown';
        const uploadDir = path.join(__dirname, 'public', 'uploads', matricule, 'images');
        if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const matricule = req.params.matricule || 'unknown';
        const ext = path.extname(file.originalname);
        cb(null, `profile-${matricule}-${Date.now()}${ext}`);
    }
});

const uploadProfile = multer({
    storage: profileStorage, limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) { cb(null, true); } else { cb(new Error('Type non autorisé.')); }
    }
});

// ==========================================
// TEST CONNEXION MYSQL
// ==========================================
async function testConnection() {
    try { const c = await pool.getConnection(); console.log('✅ MySQL connecté'); c.release(); }
    catch (err) { console.error('❌ MySQL:', err.message); }
}
testConnection();

// ==========================================
// ROUTES PAGES
// ==========================================
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/', (req, res) => res.redirect('/login'));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/course', (req, res) => res.sendFile(path.join(__dirname, 'public', 'course.html')));
app.get('/trash', (req, res) => res.sendFile(path.join(__dirname, 'public', 'trash.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));

// ==========================================
// API PING
// ==========================================
app.get('/api/ping', (req, res) => { res.json({ success: true, message: 'pong' }); });

// ==========================================
// API INSCRIPTION
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { nom, matricule, email, password, question1, reponse1, question2, reponse2 } = req.body;
        if (!nom || !matricule || !password || !question1 || !reponse1 || !question2 || !reponse2) return res.status(400).json({ success: false, message: 'Champs obligatoires manquants.' });
        const [existing] = await pool.query('SELECT id FROM users WHERE matricule = ?', [matricule]);
        if (existing.length > 0) return res.status(409).json({ success: false, message: 'Matricule existant.' });
        if (email) { const [e] = await pool.query('SELECT id FROM users WHERE email = ?', [email]); if (e.length > 0) return res.status(409).json({ success: false, message: 'Email existant.' }); }
        await pool.query('INSERT INTO users (nom, matricule, email, password, question1, reponse1, question2, reponse2) VALUES (?,?,?,?,?,?,?,?)', [nom, matricule, email||'', password, question1, reponse1, question2, reponse2]);
        const userDir = path.join(__dirname, 'public', 'uploads', matricule);
        ['images','pdfs','videos'].forEach(d => { const dir = path.join(userDir, d); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
        res.status(201).json({ success: true, message: 'Inscription réussie.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

// ==========================================
// API CONNEXION
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { matricule, password } = req.body;
        if (!matricule || !password) return res.status(400).json({ success: false, message: 'Matricule et mot de passe requis.' });
        const [rows] = await pool.query('SELECT * FROM users WHERE matricule = ? AND password = ?', [matricule, password]);
        if (rows.length === 0) return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
        const { password: _, ...safeUser } = rows[0];
        res.json({ success: true, user: safeUser });
    } catch (err) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
});

// ==========================================
// API QUESTIONS SÉCURITÉ
// ==========================================
app.get('/api/security-questions/:matricule', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT question1, question2 FROM users WHERE matricule = ?', [req.params.matricule]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Matricule introuvable.' });
        if (!rows[0].question1 || !rows[0].question2) return res.status(400).json({ success: false, message: 'Aucune question.' });
        res.json({ success: true, question1: rows[0].question1, question2: rows[0].question2 });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/verify-security-answers', async (req, res) => {
    try {
        const { matricule, reponse1, reponse2 } = req.body;
        const [rows] = await pool.query('SELECT reponse1, reponse2 FROM users WHERE matricule = ?', [matricule]);
        if (rows.length === 0) return res.status(404).json({ success: false });
        if (rows[0].reponse1.toLowerCase() === reponse1.toLowerCase() && rows[0].reponse2.toLowerCase() === reponse2.toLowerCase()) res.json({ success: true });
        else res.status(400).json({ success: false, message: 'Réponses incorrectes.' });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { matricule, newPassword } = req.body;
        if (!matricule || !newPassword) return res.status(400).json({ success: false, message: 'Champs requis.' });
        if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Minimum 8 caractères.' });
        await pool.query('UPDATE users SET password = ? WHERE matricule = ?', [newPassword, matricule]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// API MODIFIER PROFIL
// ==========================================
app.put('/api/update-profile/:matricule', async (req, res) => {
    try {
        const { nom, email } = req.body; const { matricule } = req.params;
        const [user] = await pool.query('SELECT * FROM users WHERE matricule = ?', [matricule]);
        if (user.length === 0) return res.status(404).json({ success: false });
        const updates = [], values = [];
        if (nom !== undefined) { updates.push('nom = ?'); values.push(nom); }
        if (email !== undefined) { if (email && email !== user[0].email) { const [e] = await pool.query('SELECT id FROM users WHERE email = ? AND matricule != ?', [email, matricule]); if (e.length > 0) return res.status(409).json({ success: false, message: 'Email déjà utilisé.' }); } updates.push('email = ?'); values.push(email || null); }
        if (updates.length === 0) return res.status(400).json({ success: false });
        values.push(matricule);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE matricule = ?`, values);
        const [u] = await pool.query('SELECT * FROM users WHERE matricule = ?', [matricule]);
        const { password: _, ...safeUser } = u[0];
        res.json({ success: true, user: safeUser });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/upload-profile-photo/:matricule', (req, res) => {
    uploadProfile.single('photo')(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier.' });
        const { matricule } = req.params;
        try {
            const [users] = await pool.query('SELECT id, photo FROM users WHERE matricule = ?', [matricule]);
            if (users.length === 0) { fs.unlinkSync(req.file.path); return res.status(404).json({ success: false }); }
            if (users[0].photo) { const oldPath = path.join(__dirname, 'public', users[0].photo); if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); }
            const photoUrl = `/uploads/${matricule}/images/${req.file.filename}`;
            await pool.query('UPDATE users SET photo = ? WHERE matricule = ?', [photoUrl, matricule]);
            res.json({ success: true, photoUrl });
        } catch (err) { res.status(500).json({ success: false }); }
    });
});

// ==========================================
// API VISITES (avec dédoublonnage par IP + plateforme + jour)
// ==========================================
app.post('/api/visits', async (req, res) => {
    try {
        const { platform, page, matricule } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const ua = req.headers['user-agent'] || '';
        const today = new Date().toISOString().split('T')[0];
        const [existing] = await pool.query('SELECT id FROM visits WHERE ip_address = ? AND platform = ? AND DATE(created_at) = ?', [ip, platform || 'web', today]);
        if (existing.length === 0) {
            await pool.query('INSERT INTO visits (platform, page, ip_address, user_agent, matricule) VALUES (?,?,?,?,?)', [platform || 'web', page || '/', ip, ua, matricule || null]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/visits', async (req, res) => {
    try {
        const [[total]] = await pool.query('SELECT COUNT(*) as count FROM visits');
        const [[today]] = await pool.query('SELECT COUNT(*) as count FROM visits WHERE DATE(created_at) = CURDATE()');
        const [[week]] = await pool.query('SELECT COUNT(*) as count FROM visits WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
        const [platforms] = await pool.query('SELECT platform, COUNT(*) as count FROM visits GROUP BY platform');
        const [daily] = await pool.query('SELECT DATE(created_at) as date, COUNT(*) as count FROM visits WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY date');
        const [pages] = await pool.query('SELECT page, COUNT(*) as count FROM visits GROUP BY page ORDER BY count DESC LIMIT 10');
        res.json({ success: true, total: total.count, today: today.count, week: week.count, platforms, daily, pages });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// API ADMIN - STATS
// ==========================================
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [[users]] = await pool.query('SELECT COUNT(*) as total FROM users');
        const [[courses]] = await pool.query('SELECT COUNT(*) as total FROM courses WHERE deleted_at IS NULL');
        const [[notes]] = await pool.query('SELECT COUNT(*) as total FROM notes WHERE deleted_at IS NULL');
        const [[pdfs]] = await pool.query("SELECT COUNT(*) as total FROM notes WHERE type='support' AND deleted_at IS NULL");
        const [[links]] = await pool.query("SELECT COUNT(*) as total FROM notes WHERE type='link' AND deleted_at IS NULL");
        res.json({ success: true, stats: { users: users.total, courses: courses.total, notes: notes.total, pdfs: pdfs.total, links: links.total }});
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/sql', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false });
    try { const [rows] = await pool.query(query); res.json({ success: true, data: rows, rowCount: Array.isArray(rows) ? rows.length : 0 }); }
    catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

app.delete('/api/admin/user/:matricule', async (req, res) => {
    try {
        await pool.query('DELETE FROM notes WHERE course_id IN (SELECT id FROM courses WHERE user_matricule = ?)', [req.params.matricule]);
        await pool.query('DELETE FROM courses WHERE user_matricule = ?', [req.params.matricule]);
        await pool.query('DELETE FROM users WHERE matricule = ?', [req.params.matricule]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// API COURS
// ==========================================
app.get('/api/courses/:matricule', async (req, res) => {
    try {
        const [courses] = await pool.query('SELECT * FROM courses WHERE user_matricule = ? AND deleted_at IS NULL ORDER BY created_at DESC', [req.params.matricule]);
        for (let c of courses) { const [[n]] = await pool.query('SELECT COUNT(*) as count FROM notes WHERE course_id = ? AND deleted_at IS NULL', [c.id]); c.noteCount = n.count; }
        res.json({ success: true, courses });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/courses', (req, res) => {
    uploadCourse.single('image')(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        try {
            const { title, user_matricule, professor, description } = req.body;
            if (!title || !user_matricule) return res.status(400).json({ success: false, message: 'Titre et matricule requis.' });
            let imageUrl = null;
            if (req.file) {
                const courseTitle = title.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase(), ext = path.extname(req.file.originalname);
                const userDir = path.join(__dirname, 'public', 'uploads', user_matricule, 'images');
                if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
                const newPath = path.join(userDir, `${courseTitle}${ext}`);
                if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
                fs.renameSync(req.file.path, newPath);
                imageUrl = `/uploads/${user_matricule}/images/${courseTitle}${ext}`;
            }
            const [result] = await pool.query('INSERT INTO courses (user_matricule, title, image_url, professor, description) VALUES (?,?,?,?,?)', [user_matricule, title, imageUrl, professor||null, description||null]);
            const [newCourse] = await pool.query('SELECT * FROM courses WHERE id = ?', [result.insertId]);
            res.status(201).json({ success: true, course: newCourse[0] });
        } catch (err) { res.status(500).json({ success: false }); }
    });
});

app.put('/api/courses/:id', (req, res) => {
    uploadCourse.single('image')(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        try {
            const courseId = req.params.id; const { title, professor, description } = req.body;
            const [existing] = await pool.query('SELECT * FROM courses WHERE id = ? AND deleted_at IS NULL', [courseId]);
            if (existing.length === 0) return res.status(404).json({ success: false });
            const old = existing[0]; const matricule = old.user_matricule;
            const updates = [], values = [];
            if (title !== undefined) { updates.push('title = ?'); values.push(title); }
            if (professor !== undefined) { updates.push('professor = ?'); values.push(professor||null); }
            if (description !== undefined) { updates.push('description = ?'); values.push(description||null); }
            let imageUrl = old.image_url;
            if (req.file) {
                if (old.image_url) { const p = path.join(__dirname, 'public', old.image_url); if (fs.existsSync(p)) fs.unlinkSync(p); }
                const courseTitle = (title || old.title).replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase(), ext = path.extname(req.file.originalname);
                const userDir = path.join(__dirname, 'public', 'uploads', matricule, 'images');
                if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
                const newPath = path.join(userDir, `${courseTitle}${ext}`);
                if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
                fs.renameSync(req.file.path, newPath);
                imageUrl = `/uploads/${matricule}/images/${courseTitle}${ext}`;
                updates.push('image_url = ?'); values.push(imageUrl);
            }
            if (updates.length > 0) { values.push(courseId); await pool.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, values); }
            const [updated] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
            res.json({ success: true, course: updated[0] });
        } catch (err) { res.status(500).json({ success: false }); }
    });
});

app.delete('/api/courses/:id', async (req, res) => {
    try {
        const [course] = await pool.query('SELECT * FROM courses WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
        if (course.length === 0) return res.status(404).json({ success: false });
        await pool.query('UPDATE courses SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
        await pool.query('UPDATE notes SET deleted_at = NOW() WHERE course_id = ? AND deleted_at IS NULL', [req.params.id]);
        res.json({ success: true, message: 'Cours dans la corbeille.' });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/course/:id', async (req, res) => {
    try {
        const [course] = await pool.query('SELECT * FROM courses WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
        if (course.length === 0) return res.status(404).json({ success: false });
        const [notes] = await pool.query('SELECT * FROM notes WHERE course_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [req.params.id]);
        res.json({ success: true, course: course[0], notes });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// API NOTES
// ==========================================
app.post('/api/notes', (req, res) => {
    uploadNote.single('file')(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        try {
            const { course_id, title, content, type, user_matricule } = req.body;
            if (!course_id || !title) return res.status(400).json({ success: false, message: 'Cours et titre requis.' });
            let fileUrl = null;
            if (req.file) {
                const matricule = user_matricule || 'unknown', fileExt = path.extname(req.file.filename).toLowerCase();
                let subFolder = 'pdfs';
                if (['.jpg','.jpeg','.png','.gif','.webp','.bmp'].includes(fileExt)) subFolder = 'images';
                else if (['.mp4','.avi','.mov','.mkv','.webm'].includes(fileExt)) subFolder = 'videos';
                fileUrl = `/uploads/${matricule}/${subFolder}/${req.file.filename}`;
            }
            const [result] = await pool.query('INSERT INTO notes (course_id, title, content, file_url, type) VALUES (?,?,?,?,?)', [course_id, title, content||'', fileUrl, type||'note']);
            const [newNote] = await pool.query('SELECT * FROM notes WHERE id = ?', [result.insertId]);
            res.status(201).json({ success: true, note: newNote[0] });
        } catch (err) { res.status(500).json({ success: false }); }
    });
});

app.put('/api/notes/:id', async (req, res) => {
    try {
        const { title, content } = req.body;
        const [note] = await pool.query('SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
        if (note.length === 0) return res.status(404).json({ success: false });
        const updates = [], values = [];
        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (content !== undefined) { updates.push('content = ?'); values.push(content); }
        if (updates.length === 0) return res.status(400).json({ success: false });
        values.push(req.params.id);
        await pool.query(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, values);
        const [updated] = await pool.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
        res.json({ success: true, note: updated[0] });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        const [note] = await pool.query('SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
        if (note.length === 0) return res.status(404).json({ success: false });
        await pool.query('UPDATE notes SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Note dans la corbeille.' });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// API CORBEILLE
// ==========================================
app.get('/api/trash/:matricule', async (req, res) => {
    try {
        const [courses] = await pool.query('SELECT * FROM courses WHERE user_matricule = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC', [req.params.matricule]);
        const [notes] = await pool.query('SELECT n.*, c.title as course_title FROM notes n JOIN courses c ON n.course_id = c.id WHERE n.deleted_at IS NOT NULL AND c.user_matricule = ? ORDER BY n.deleted_at DESC', [req.params.matricule]);
        res.json({ success: true, courses, notes });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/trash/restore/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type === 'course') { await pool.query('UPDATE courses SET deleted_at = NULL WHERE id = ?', [id]); await pool.query('UPDATE notes SET deleted_at = NULL WHERE course_id = ?', [id]); }
        else if (type === 'note') { await pool.query('UPDATE notes SET deleted_at = NULL WHERE id = ?', [id]); }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/trash/permanent/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type === 'course') {
            const [course] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
            if (course[0]?.image_url) { const p = path.join(__dirname, 'public', course[0].image_url); if (fs.existsSync(p)) fs.unlinkSync(p); }
            const [notes] = await pool.query('SELECT file_url FROM notes WHERE course_id = ? AND file_url IS NOT NULL', [id]);
            notes.forEach(n => { if (n.file_url) { const fp = path.join(__dirname, 'public', n.file_url); if (fs.existsSync(fp)) fs.unlinkSync(fp); } });
            await pool.query('DELETE FROM notes WHERE course_id = ?', [id]); await pool.query('DELETE FROM courses WHERE id = ?', [id]);
        } else if (type === 'note') {
            const [note] = await pool.query('SELECT * FROM notes WHERE id = ?', [id]);
            if (note[0]?.file_url) { const p = path.join(__dirname, 'public', note[0].file_url); if (fs.existsSync(p)) fs.unlinkSync(p); }
            await pool.query('DELETE FROM notes WHERE id = ?', [id]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/trash/empty/:matricule', async (req, res) => {
    try {
        const [courses] = await pool.query('SELECT * FROM courses WHERE user_matricule = ? AND deleted_at IS NOT NULL', [req.params.matricule]);
        for (const c of courses) {
            if (c.image_url) { const p = path.join(__dirname, 'public', c.image_url); if (fs.existsSync(p)) fs.unlinkSync(p); }
            const [notes] = await pool.query('SELECT file_url FROM notes WHERE course_id = ? AND file_url IS NOT NULL', [c.id]);
            notes.forEach(n => { if (n.file_url) { const fp = path.join(__dirname, 'public', n.file_url); if (fs.existsSync(fp)) fs.unlinkSync(fp); } });
        }
        await pool.query('DELETE FROM notes WHERE course_id IN (SELECT id FROM courses WHERE user_matricule = ? AND deleted_at IS NOT NULL)', [req.params.matricule]);
        await pool.query('DELETE FROM courses WHERE user_matricule = ? AND deleted_at IS NOT NULL', [req.params.matricule]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// API THÈME
// ==========================================
app.post('/api/save-theme', async (req, res) => {
    try { const { matricule, theme } = req.body; await pool.query('UPDATE users SET theme = ? WHERE matricule = ?', [theme, matricule]); res.json({ success: true }); }
    catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/user/:matricule', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE matricule = ?', [req.params.matricule]);
        if (rows.length === 0) return res.status(404).json({ success: false });
        const { password, ...user } = rows[0];
        res.json({ success: true, user });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// DÉMARRAGE
// ==========================================
app.listen(PORT, () => { console.log(`🚀 GeNot prêt sur le port ${PORT}`); });