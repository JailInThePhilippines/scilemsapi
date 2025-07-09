const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

class AuthController {
    static generateTokens(payload) {
        const [accessToken, refreshToken] = [
            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            ),
            jwt.sign(
                payload,
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '14d' }
            )
        ];

        return { accessToken, refreshToken };
    }

    static async login(req, res, username, password) {
        try {
            const user = await req.userModel.findOne({ username }).select('+password');

            if (!user) {
                return { message: 'Invalid credentials' };
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return { message: 'Invalid credentials' };
            }

            await req.userModel.updateOne(
                { _id: user._id },
                {
                    lastLogin: new Date(),
                    refreshToken: null
                }
            );

            const payload = {
                user: {
                    id: user._id,
                    role: user.role
                }
            };

            const { accessToken, refreshToken } = this.generateTokens(payload);

            await req.userModel.updateOne(
                { _id: user._id },
                { refreshToken: refreshToken }
            );

            const userData = user.toObject();
            delete userData.password;

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== 'development',
                sameSite: process.env.NODE_ENV !== 'development' ? 'None' : 'Lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            // Instead of res.json, return the result:
            return {
                message: 'Login successful',
                accessToken,
                user: userData
            };

        } catch (error) {
            console.error(error);
            // Instead of res.status, throw error to be handled by caller
            throw error;
        }
    }

    static async refreshToken(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({ message: 'Refresh token not found' });
            }

            let decoded;
            try {
                decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            } catch (error) {
                return res.status(401).json({ message: 'Invalid refresh token' });
            }

            const user = await req.userModel.findOne({
                _id: decoded.user.id,
                refreshToken: refreshToken
            }).select('_id role');

            if (!user) {
                return res.status(401).json({ message: 'Invalid refresh token' });
            }

            const payload = {
                user: {
                    id: user._id,
                    role: user.role
                }
            };

            const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(payload);

            await req.userModel.updateOne(
                { _id: user._id },
                { refreshToken: newRefreshToken }
            );

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== 'development',
                sameSite: process.env.NODE_ENV !== 'development' ? 'None' : 'Lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.json({
                accessToken
            });
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Invalid refresh token' });
        }
    }

    static async logout(req, res) {
        try {
            await req.userModel.updateOne(
                { _id: req.user.id },
                { refreshToken: null }
            );

            res.clearCookie('refreshToken');
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server Error' });
        }
    }

    static async register(userModel, userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = new userModel({
            ...userData,
            password: hashedPassword
        });
        await newUser.save();
        const userObject = newUser.toObject();
        delete userObject.password;
        return userObject;
    }

    static async registerUser(userModel, userData) {
        const newUser = new userModel(userData);
        await newUser.save();
        return newUser;
    }

    static async changePassword(req, res) {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword, confirmPassword } = req.body;

            if (!currentPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({ message: 'New passwords do not match' });
            }

            const user = await req.userModel.findById(userId).select('+password');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();

            res.status(200).json({ message: 'Password updated successfully' });

        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    }

}

module.exports = AuthController;