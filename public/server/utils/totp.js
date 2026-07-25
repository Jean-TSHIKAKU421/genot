const crypto = require('crypto');

function generateSecret() { return crypto.randomBytes(20).toString('base64').replace(/[^A-Za-z0-9]/g, '').substring(0, 16); }

function base32Decode(secret) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '', bytes = [];
    secret = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
    for (let i = 0; i < secret.length; i++) {
        const val = alphabet.indexOf(secret[i]);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}

function generateTOTP(secret) {
    const counter = Math.floor(Date.now() / 1000 / 30);
    const key = base32Decode(secret);
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(Math.floor(counter / Math.pow(2, 32)), 0);
    buffer.writeUInt32BE(counter >>> 0, 4);
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buffer);
    const hash = hmac.digest();
    const offset = hash[hash.length - 1] & 0x0F;
    const code = ((hash[offset] & 0x7F) << 24 | (hash[offset + 1] & 0xFF) << 16 | (hash[offset + 2] & 0xFF) << 8 | (hash[offset + 3] & 0xFF)) % 1000000;
    return code.toString().padStart(6, '0');
}

function verifyTOTP(secret, token) {
    if (!secret || !token) return false;
    const now = Math.floor(Date.now() / 1000 / 30);
    for (let i = -1; i <= 1; i++) {
        const counter = now + i;
        const key = base32Decode(secret);
        const buffer = Buffer.alloc(8);
        buffer.writeUInt32BE(Math.floor(counter / Math.pow(2, 32)), 0);
        buffer.writeUInt32BE(counter >>> 0, 4);
        const hmac = crypto.createHmac('sha1', key);
        hmac.update(buffer);
        const hash = hmac.digest();
        const offset = hash[hash.length - 1] & 0x0F;
        const code = ((hash[offset] & 0x7F) << 24 | (hash[offset + 1] & 0xFF) << 16 | (hash[offset + 2] & 0xFF) << 8 | (hash[offset + 3] & 0xFF)) % 1000000;
        if (code.toString().padStart(6, '0') === token) return true;
    }
    return false;
}

function generateQRCode(secret, email) {
    const otpauth = `otpauth://totp/GeNot:${encodeURIComponent(email)}?secret=${secret}&issuer=GeNot`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
}

module.exports = { generateSecret, generateTOTP, verifyTOTP, generateQRCode };