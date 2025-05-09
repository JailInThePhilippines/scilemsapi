const express = require('express');
const router = express.Router();
const {
  addCategory,
  addEquipment,
  getCategories,
  getEquipments,
  editEquipment,
  deleteEquipment
} = require('../controllers/inventoryController');
const validationRules = require('../utils/validation');
const authMiddleware = require('../middlewares/authMiddleware');
const { upload, uploadToCloudinary } = require('../middlewares/uploadMiddleware');

router.get('/categories', authMiddleware, getCategories);
router.get('/equipments', authMiddleware, getEquipments);

router.get('/categories/open', getCategories);
router.get('/equipments/open', getEquipments);

router.post('/category/add', authMiddleware, validationRules.category, addCategory);
router.post(
  '/equipment/add',
  authMiddleware,
  upload.single('image'),
  validationRules.equipment,
  addEquipment
);

router.put(
  '/equipment/edit/:id',
  authMiddleware,
  upload.single('image'),
  validationRules.equipment,
  editEquipment
);

router.delete('/equipment/delete/:id', authMiddleware, deleteEquipment);

module.exports = router;