const User = require('../models/userModel');
const AuthController = require('./authController');
const Cart = require('../models/cartModel');
const Equipment = require('../models/equipmentModel');
const { validationResult } = require('express-validator');
const generatePassword = require('../utils/passwordGenerator');
const { sendAccountCreationEmail } = require('../utils/emailConfig');
const { encrypt, decrypt } = require('../utils/aesUtil');

exports.createUserByAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can create user accounts' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, role } = req.body;

        if (!['Student', 'Teacher'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be either "Student" or "Teacher"' });
        }

        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({
                message: existingUser.username === username
                    ? 'User with this username already exists'
                    : 'User with this email already exists'
            });
        }

        const generatedPassword = generatePassword(12);

        const userData = {
            ...req.body,
            password: generatedPassword
        };

        const user = await AuthController.register(User, userData);

        try {
            await sendAccountCreationEmail(user.email, user.username, generatedPassword);
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            return res.status(201).json({
                message: 'User created successfully but there was an issue sending the email notification',
                user,
                emailStatus: 'failed'
            });
        }

        res.status(201).json({
            message: 'User created successfully and credentials sent to their email',
            user,
            emailStatus: 'sent'
        });
    } catch (error) {
        console.error('Error creating user by admin:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.loginUser = async (req, res) => {
    try {
        // Decrypt incoming payload
        const { encrypted } = req.body;
        const decryptedPayload = JSON.parse(decrypt(encrypted));
        console.log('Decrypted login payload:', decryptedPayload);
        const { username, password } = decryptedPayload;

        req.userModel = User;
        const loginResponse = await AuthController.login(req, res, username, password);

        // Handle invalid credentials
        if (!loginResponse || !loginResponse.user || !loginResponse.accessToken) {
            return res.status(400).json({ message: loginResponse?.message || 'Invalid credentials' });
        }

        // After generating JWT and user object:
        const { user, accessToken } = loginResponse;
        const responsePayload = {
            user,
            accessToken,
        };
        const encryptedResponse = encrypt(JSON.stringify(responsePayload));
        res.json({ encrypted: encryptedResponse });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.refreshToken = async (req, res) => {
    req.userModel = User;
    return AuthController.refreshToken(req, res);
};

exports.logout = async (req, res) => {
    req.userModel = User;
    return AuthController.logout(req, res);
};

exports.getLoggedInUser = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'User details retrieved successfully',
            user
        });
    } catch (error) {
        console.error('Error fetching logged-in user details:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can view all users.' });
        }

        const users = await User.find().select('-password -refreshToken');

        res.status(200).json({
            message: 'Users retrieved successfully',
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.editProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const allowedFields = ['firstname', 'middlename', 'lastname', 'suffix', 'email'];
        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password -refreshToken');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.changePassword = async (req, res) => {
    req.userModel = User;
    return AuthController.changePassword(req, res);
};