const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
const User = require('../models/userModel');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const userId = decoded.user.id || decoded.user._id;

        let user;
        if (decoded.user.role === 'admin') {
            user = await Admin.findById(userId);
        } else {
            user = await User.findById(userId);
        }

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = authMiddleware;