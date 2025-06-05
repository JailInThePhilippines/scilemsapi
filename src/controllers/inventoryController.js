const Equipment = require('../models/equipmentModel');
const Category = require('../models/categoryModel');
const { validationResult } = require('express-validator');
const { uploadToCloudinary } = require('../middlewares/uploadMiddleware');
const notificationService = require('../utils/notificationService');

const ensureNoCategoryExists = async () => {
    let noCategory = await Category.findOne({ name: 'No Category' });
    if (!noCategory) {
        noCategory = new Category({ name: 'No Category' });
        await noCategory.save();
    }
    return noCategory;
};

exports.addCategory = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;

    try {
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        const category = new Category({ name });
        await category.save();

        await notificationService.createGlobalNotification({
            title: 'New Category Added',
            description: `A new category "${name}" has been added to the catalog.`,
            resourceType: 'category',
            resourceId: category._id
        });

        return res.status(201).json({
            message: 'Category created successfully',
            category
        });
    } catch (err) {
        console.error('Error creating category:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.editCategory = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name } = req.body;

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        if (category.name === 'No Category') {
            return res.status(400).json({ error: 'Cannot edit the default "No Category" category' });
        }

        const existingCategory = await Category.findOne({ name });
        if (existingCategory && existingCategory._id.toString() !== id) {
            return res.status(400).json({ error: 'Another category with this name already exists' });
        }

        category.name = name;
        await category.save();

        return res.status(200).json({
            message: 'Category updated successfully',
            category
        });
    } catch (err) {
        console.error('Error editing category:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        if (category.name === 'No Category') {
            return res.status(400).json({ error: 'Cannot delete the default "No Category" category' });
        }

        const noCategory = await ensureNoCategoryExists();

        const equipmentCount = await Equipment.countDocuments({ catID: id });
        if (equipmentCount > 0) {
            await Equipment.updateMany(
                { catID: id },
                { catID: noCategory._id }
            );
        }

        await Category.deleteOne({ _id: id });

        const message = equipmentCount > 0
            ? `Category deleted successfully. ${equipmentCount} equipment(s) moved to "No Category".`
            : 'Category deleted successfully';

        return res.status(200).json({
            message,
            movedEquipmentCount: equipmentCount
        });
    } catch (err) {
        console.error('Error deleting category:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.addEquipment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { catID, name, stock, description, ytLink } = req.body;

    try {
        let categoryId = catID;

        // If no category provided or category doesn't exist, use "No Category"
        if (!catID) {
            const noCategory = await ensureNoCategoryExists();
            categoryId = noCategory._id;
        } else {
            const category = await Category.findById(catID);
            if (!category) {
                const noCategory = await ensureNoCategoryExists();
                categoryId = noCategory._id;
            }
        }

        let imageUrl = '';
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file);
                imageUrl = result.secure_url;
            } catch (error) {
                console.error('Error uploading image:', error);
                return res.status(400).json({ error: 'Image upload failed' });
            }
        }

        const equipment = new Equipment({
            catID: categoryId,
            name,
            stock: parseInt(stock, 10),
            description,
            image: imageUrl,
            ytLink
        });

        await equipment.save();

        await notificationService.createGlobalNotification({
            title: 'New Equipment Added',
            description: `A new ${name} has been added to the catalog.`,
            resourceType: 'equipment',
            resourceId: equipment._id
        });

        return res.status(201).json({
            message: 'Equipment created successfully',
            equipment
        });
    } catch (err) {
        console.error('Error creating equipment:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.getCategories = async (req, res) => {
    try {
        await ensureNoCategoryExists();

        const categories = await Category.find().sort({ name: 1 });
        return res.status(200).json({ categories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.getEquipments = async (req, res) => {
    try {
        const query = {};

        if (req.query.catID) {
            query.catID = req.query.catID;
        }

        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: 'i' };
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const equipments = await Equipment.find(query)
            .populate('catID', 'name')
            .sort({ dateAdded: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Equipment.countDocuments(query);

        return res.status(200).json({
            equipments,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching equipments:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.editEquipment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { catID, name, stock, description, ytLink, removeImage } = req.body;

    try {
        const equipment = await Equipment.findById(id);
        if (!equipment) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        const category = await Category.findById(catID);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        let imageUrl = equipment.image;

        if (removeImage === 'true' || removeImage === true) {
            imageUrl = null;
        }
        else if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file);
                imageUrl = result.secure_url;
            } catch (error) {
                console.error('Error uploading image:', error);
                return res.status(400).json({ error: 'Image upload failed' });
            }
        }

        equipment.catID = catID;
        equipment.name = name;
        equipment.stock = parseInt(stock, 10);
        equipment.description = description;
        equipment.image = imageUrl;
        equipment.ytLink = ytLink;

        await equipment.save();

        return res.status(200).json({
            message: 'Equipment updated successfully',
            equipment
        });
    } catch (err) {
        console.error('Error updating equipment:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteEquipment = async (req, res) => {
    const { id } = req.params;

    try {
        const equipment = await Equipment.findByIdAndDelete(id);
        if (!equipment) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        return res.status(200).json({ message: 'Equipment deleted successfully' });
    } catch (err) {
        console.error('Error deleting equipment:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

// Optional lang to, di man need. Can comment out kung gusto mo.
exports.initializeDefaultCategory = async () => {
    try {
        await ensureNoCategoryExists();
        console.log('Default "No Category" initialized successfully');
    } catch (error) {
        console.error('Error initializing default category:', error);
    }
};