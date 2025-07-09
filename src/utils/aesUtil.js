const crypto = require('crypto');

const AES_SECRET = process.env.AES_SECRET || 'aes_secret_key_32bytes_long!'; // 32 bytes for AES-256

function getKey() {
    let key = Buffer.from(AES_SECRET, 'utf8');
    if (key.length < 32) {
        // pad with zeros
        const padded = Buffer.alloc(32);
        key.copy(padded);
        key = padded;
    } else if (key.length > 32) {
        key = key.slice(0, 32);
    }
    return key;
}

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const key = getKey();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}

function decrypt(encryptedText) {
    const [ivStr, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivStr, 'base64');
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { encrypt, decrypt };
