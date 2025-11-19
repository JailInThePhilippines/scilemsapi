const jwt = require('jsonwebtoken');

/**
 * Accepts either:
 * - a static bearer token matching `process.env.PING_BEARER_TOKEN`, OR
 * - a valid JWT signed with `process.env.JWT_SECRET` (no DB lookup)
 *
 * This allows cron services to use a static token, while still permitting
 * existing service tokens if needed.
 */
const pingAuthMiddleware = (req, res, next) => {
  try {
    const header = req.header('Authorization') || '';
    const token = header.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // First, allow a static ping token (configure in Render / environment)
    if (process.env.PING_BEARER_TOKEN && token === process.env.PING_BEARER_TOKEN) {
      return next();
    }

    // Fallback: accept a valid JWT (signed with JWT_SECRET) without DB lookup
    if (process.env.JWT_SECRET) {
      try {
        jwt.verify(token, process.env.JWT_SECRET);
        return next();
      } catch (err) {
        // fall through to reject below
      }
    }

    return res.status(401).json({ message: 'Token is not valid for ping route' });
  } catch (error) {
    console.error('Ping auth middleware error:', error);
    return res.status(401).json({ message: 'Authorization failed' });
  }
};

module.exports = pingAuthMiddleware;
