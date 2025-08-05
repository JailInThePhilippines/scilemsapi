const crypto = require('crypto');
const AES_KEY = Buffer.from(process.env.AES_KEY, 'hex');
const AES_IV = Buffer.from(process.env.AES_IV, 'hex');

module.exports = (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, AES_IV);
      let decrypted = decipher.update(data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      req.body = JSON.parse(decrypted);
      next();
    } catch (err) {
      res.status(400).json({ message: 'Invalid encrypted payload' });
    }
  });
};
