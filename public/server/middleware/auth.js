const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const JWT_SECRET = process.env.JWT_SECRET || 'genot_secret_key_2024';

function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) { logger.log('auth_failed', null, req.ip, 'Token manquant'); return res.status(401).json({ success: false, message: 'Authentification requise' }); }
    try { const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); }
    catch (error) { logger.log('auth_failed', null, req.ip, 'Token invalide: ' + error.message); return res.status(401).json({ success: false, message: 'Token invalide' }); }
}

module.exports = { authMiddleware };