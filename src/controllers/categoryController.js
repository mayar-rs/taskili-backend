const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /categories
// @access  Public
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.status(200).json({ success: true, count: categories.length, data: categories });
    } catch (error) {
        next(error);
    }
};

// @desc    Create category
// @route   POST /categories
// @access  Private (Admin only)
exports.createCategory = async (req, res, next) => {
    try {
        const category = await Category.create(req.body);
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        // If unique slug/name constraint fails
        if (error.code === 11000) {
            return res.status(400).json({ message: "Category with this name or slug already exists" });
        }
        next(error);
    }
};

// @desc    Update category
// @route   PUT /categories/:id
// @access  Private (Admin only)
exports.updateCategory = async (req, res, next) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete category
// @route   DELETE /categories/:id
// @access  Private (Admin only)
exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        await category.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
