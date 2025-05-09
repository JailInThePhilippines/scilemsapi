const express = require('express');
const router = express.Router();
const {
    loginAdmin,
    refreshToken,
    logout,
    getAdminDetails,
    createAdmin,
    updateUserDetails,
    deleteUser,
    getAllBorrowedItemsDetailsForAdmin,
    confirmApplication,
    declineApplication,
    getAllApprovedTransactions,
    confirmBorrowedStatus,
    declineApproval,
    getAllBorrowedTransactions,
    confirmReturn,
    removeBorrowedRecords,
    getAllReturnedItems,
    getAllArchivedRecords,
    restoreArchivedRecord,
    getAllPendingItems,
    getUserCount,
    getUsersWithBorrowedOrPendingTransactions,
    getEquipmentBorrowedAndReturnedCount,
    getEquipmentCountPerCategory,
    getMonthlyBorrowerCounts
} = require('../controllers/adminController')
const AuthController = require('../controllers/authController');
const validationRules = require('../utils/validation');
const authMiddleware = require('../middlewares/authMiddleware');
const Admin = require('../models/adminModel');

router.get('/me', authMiddleware, getAdminDetails);
router.get('/borrowed-items', authMiddleware, getAllBorrowedItemsDetailsForAdmin);
router.get('/transactions/approved', authMiddleware, getAllApprovedTransactions);
router.get('/transactions/borrowed', authMiddleware, getAllBorrowedTransactions);
router.get('/transactions/returned', authMiddleware, getAllReturnedItems);
router.get('/transactions/archived', authMiddleware, getAllArchivedRecords);
router.get('/transactions/pending', authMiddleware, getAllPendingItems);
router.get('/user/count', authMiddleware, getUserCount);
router.get('/user/counts', authMiddleware, getUsersWithBorrowedOrPendingTransactions);
router.get('/equipment/borrowed-and-returned-count', authMiddleware, getEquipmentBorrowedAndReturnedCount);
router.get('/equipment/category/counts', authMiddleware, getEquipmentCountPerCategory);
router.get('/monthly/borrower/counts', authMiddleware, getMonthlyBorrowerCounts);

router.post('/auth/register', validationRules.admin, createAdmin);
router.post('/auth/login', validationRules.login, loginAdmin);
router.post('/refresh-token', refreshToken);
router.post('/logout', authMiddleware, logout);

router.put('/update/user/:id', authMiddleware, updateUserDetails);
router.put('/confirm/application/:transactionId', authMiddleware, confirmApplication);
router.put('/decline/application/:transactionId', authMiddleware, declineApplication);
router.put('/confirm/borrowed/:transactionId', authMiddleware, confirmBorrowedStatus);
router.put('/decline/approval/:transactionId', authMiddleware, declineApproval);
router.put('/return/item/:transactionId', authMiddleware, confirmReturn);
router.put('/remove/borrowed/:transactionId', authMiddleware, removeBorrowedRecords);
router.put('/restore/archived/:transactionId', authMiddleware, restoreArchivedRecord);


router.delete('/delete/user/:id', authMiddleware, deleteUser);

module.exports = router;