const { verifyTOTP } = require('../utils/totp');
const logger = require('../utils/logger');

function adminMiddleware(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        logger.log('admin_access_denied', req.user?.id, req.ip, 'Tentative accès admin');
        return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    if (!req.user.adminSecret) return next();
    const totpToken = req.headers['x-totp'];
    if (!totpToken) return res.status(403).json({ success: false, message: 'Code TOTP requis', requireTOTP: true });
    if (!verifyTOTP(req.user.adminSecret, totpToken)) {
        logger.log('totp_failed', req.user.id, req.ip, 'Code TOTP invalide');
        return res.status(403).json({ success: false, message: 'Code TOTP invalide' });
    }
    next();
}

module.exports = { adminMiddleware };