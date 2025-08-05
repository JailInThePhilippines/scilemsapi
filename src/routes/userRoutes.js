const express = require('express');
const router = express.Router();
const {
  loginUser,
  refreshToken,
  logout,
  getLoggedInUser,
  createUserByAdmin,
  getAllUsers,
  editProfile,
  changePassword,
} = require('../controllers/userController');
const validationRules = require('../utils/validation');
const authMiddleware = require('../middlewares/authMiddleware');
const decryptBodyMiddleware = require('../utils/decryptBodyMiddleware');


router.post(
  '/auth/register',
  [authMiddleware, validationRules.user],
  createUserByAdmin
);
router.get('/me', authMiddleware, getLoggedInUser);
router.get('/', authMiddleware, getAllUsers);
router.post('/auth/login', decryptBodyMiddleware, validationRules.login, loginUser);
router.post('/refresh-token', refreshToken);
router.post('/logout', authMiddleware, logout);
router.put('/password/change', authMiddleware, changePassword);
router.put('/edit/profile', authMiddleware, editProfile);

module.exports = router;