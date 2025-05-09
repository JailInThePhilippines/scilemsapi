const { body } = require('express-validator');

const baseValidation = {
    email: body('email').isEmail().withMessage('Please enter a valid email'),
    password: body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    username: body('username').isString().notEmpty().withMessage('Username is required')
};

const validationRules = {
    login: [
        baseValidation.username,
        body('password').notEmpty().withMessage('Password is required')
    ],

    admin: [
        baseValidation.username,
        baseValidation.password,
        body('permissions').isArray().optional()
    ],

    user: [
        body('firstname').isString().notEmpty().withMessage('First name is required'),
        body('lastname').isString().notEmpty().withMessage('Last name is required'),
        baseValidation.email,
        body('lastLogin').optional().isDate().withMessage('Last login must be a valid date')
    ],

    category: [
        body('name')
            .isString()
            .withMessage('Category name must be a string')
            .notEmpty()
            .withMessage('Category name is required')
    ],

    equipment: [
        body('catID')
            .isMongoId()
            .withMessage('Valid category ID is required'),
        body('name')
            .isString()
            .withMessage('Equipment name must be a string')
            .notEmpty()
            .withMessage('Equipment name is required'),
        body('stock')
            .isInt({ min: 0 })
            .withMessage('Stock must be a positive number'),
        body('description')
            .optional()
            .isString()
            .withMessage('Description must be a string'),
        body('ytLink')
            .optional()
            .isURL()
            .withMessage('YouTube link must be a valid URL')
    ]
};

module.exports = validationRules;