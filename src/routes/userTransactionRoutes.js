const express = require('express');
const router = express.Router();
const {
  addToCart,
  getCart,
  deleteItemInCart,
  editQuantity,
  borrowItems,
  getBorrowedItemsDetails,
  updatePickUpDate,
  resetTransaction,
  cancelApplication,
  getMyTransactions
} = require('../controllers/userTransactionController');
const validationRules = require('../utils/validation');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/cart', authMiddleware, getCart);
router.get('/items/borrowed', authMiddleware, getBorrowedItemsDetails);
router.get('/', authMiddleware, getMyTransactions);

router.post('/cart/add', authMiddleware, addToCart);
router.post('/borrow', authMiddleware, borrowItems);

// Update pick up date (by borrower)
router.put('/pickup/:id', authMiddleware, updatePickUpDate);

// Reset transaction (move items back to cart)
router.put('/reset/:id', authMiddleware, resetTransaction);

router.put('/cart/delete', authMiddleware, deleteItemInCart);
router.put('/cart/edit', authMiddleware, editQuantity);

router.delete('/items/cancel/:id', authMiddleware, cancelApplication);


module.exports = router;