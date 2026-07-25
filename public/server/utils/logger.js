const pool = require('../db');
const LOG_TYPES = {
    LOGIN: 'login', LOGIN_FAILED: 'login_failed', LOGOUT: 'logout',
    COURSE_CREATE: 'course_create', COURSE_UPDATE: 'course_update', COURSE_DELETE: 'course_delete',
    NOTE_CREATE: 'note_create', NOTE_UPDATE: 'note_update', NOTE_DELETE: 'note_delete',
    FILE_UPLOAD: 'file_upload', ADMIN_ACCESS: 'admin_access', TOTP_FAILED: 'totp_failed',
    SEARCH: 'search', VIEW_PDF: 'view_pdf', PLAY_AUDIO: 'play_audio', DOWNLOAD: 'download', ERROR: 'error'
};
async function log(type, userId, ip, details, userAgent) {
    try { await pool.query('INSERT INTO logs (type, user_id, ip_address, details, user_agent) VALUES (?, ?, ?, ?, ?)', [type, userId || null, ip || '0.0.0.0', details || '', userAgent || 'Server']); }
    catch (error) { console.error('Log error:', error.message); }
}
async function getLogs(filters = {}) {
    let query = 'SELECT l.*, u.nom as user_name FROM logs l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1';
    const params = [];
    if (filters.type) { query += ' AND l.type = ?'; params.push(filters.type); }
    if (filters.userId) { query += ' AND l.user_id = ?'; params.push(filters.userId); }
    if (filters.startDate) { query += ' AND l.created_at >= ?'; params.push(filters.startDate); }
    if (filters.endDate) { query += ' AND l.created_at <= ?'; params.push(filters.endDate); }
    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(filters.limit) || 100, parseInt(filters.offset) || 0);
    const [rows] = await pool.query(query, params);
    return rows;
}
module.exports = { log, getLogs, LOG_TYPES };