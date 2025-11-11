const express = require('express');
const router = express.Router();
const {
  addCategory,
  editCategory,
  deleteCategory,
  addEquipment,
  getCategories,
  getLabs,
  getEquipments,
  addLab,
  editLab,
  deleteLab,
  editEquipment,
  deleteEquipment
} = require('../controllers/inventoryController');
const validationRules = require('../utils/validation');
const authMiddleware = require('../middlewares/authMiddleware');
const { upload, uploadToCloudinary } = require('../middlewares/uploadMiddleware');

router.get('/categories', authMiddleware, getCategories);
router.get('/labs', authMiddleware, getLabs);
router.get('/equipments', authMiddleware, getEquipments);

router.get('/categories/open', getCategories);
router.get('/equipments/open', getEquipments);
router.get('/labs/open', getLabs);

router.post('/category/add', authMiddleware, validationRules.category, addCategory);
router.post('/lab/add', authMiddleware, validationRules.lab, addLab);

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

router.put('/category/edit/:id', authMiddleware, validationRules.category, editCategory);
router.put('/lab/edit/:id', authMiddleware, validationRules.lab, editLab);

router.delete('/equipment/delete/:id', authMiddleware, deleteEquipment);

router.delete('/category/delete/:id', authMiddleware, deleteCategory);
router.delete('/lab/delete/:id', authMiddleware, deleteLab);

module.exports = router;