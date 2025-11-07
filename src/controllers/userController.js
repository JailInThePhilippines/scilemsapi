const User = require('../models/userModel');
const AuthController = require('./authController');
const Cart = require('../models/cartModel');
const Equipment = require('../models/equipmentModel');
const { validationResult } = require('express-validator');
const generatePassword = require('../utils/passwordGenerator');
// Use the central email service which other notifications use successfully
const emailService = require('../utils/emailService');

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

                // Build account creation email using the shared email service
                const subject = 'Welcome to SCILEMS - Your Account Information';
                const textContent = `\nWelcome to SCILEMS!\n\nYour account has been created by an administrator.\n\nUsername: ${user.username}\nTemporary Password: ${generatedPassword}\n\nPlease log in using these credentials and change your password immediately for security purposes.\n\nThank you for using SCILEMS!\n`;
                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2 style="color: #2c3e50; margin: 0;">Welcome to <span style="color: #3498db;">SCILEMS</span>!</h2>
                        </div>

                        <p style="color: #333; font-size: 15px; line-height: 1.5;">
                            Your account has been created by an administrator. Below are your login credentials:
                        </p>

                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e0e0e0;">
                            <p style="margin: 0; font-size: 15px;"><strong>Username:</strong> ${user.username}</p>
                            <p style="margin: 5px 0 0; font-size: 15px;"><strong>Temporary Password:</strong> ${generatedPassword}</p>
                        </div>

                        <p style="color: #333; font-size: 15px; line-height: 1.5;">
                            Please log in using these credentials and <strong>change your password immediately</strong> for security purposes.
                        </p>

                        <div style="text-align: center; margin: 25px 0;">
                            <a href="https://scilems.pages.dev/home" 
                                style="display: inline-block; padding: 12px 25px; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px;">
                                Go to SCILEMS
                            </a>
                        </div>

                        <p style="color: #333; font-size: 15px; line-height: 1.5;">
                            If you have any questions, please contact our support team.
                        </p>

                        <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #777;">
                            <p>This is an automated message, please do not reply to this email.</p>
                        </div>
                    </div>
                `;

                try {
                        await emailService.sendEmail(user.email, subject, textContent, htmlContent);
                } catch (emailError) {
                        console.error('Failed to send account creation email via shared service:', emailError);
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
    req.userModel = User;
    return AuthController.login(req, res);
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