const Task = require('../models/Task');

// @desc    Create a task
// @route   POST /tasks
// @access  Private (Employer only)
exports.createTask = async (req, res, next) => {
    try {
        if (req.user.role !== 'employer') {
            return res.status(403).json({ message: "Only employers can create tasks" });
        }

        const task = await Task.create({
            ...req.body,
            createdBy: req.user.id
        });

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all tasks with filters and pagination
// @route   GET /tasks
// @access  Public
exports.getTasks = async (req, res, next) => {
    try {
        const { q, category, wilaya, commune, minPrice, maxPrice, status, page = 1, limit = 10 } = req.query;

        let query = {};
        if (q) {
            query.$or = [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }
        if (category) query.category = category;
        if (wilaya) query.wilaya = wilaya;
        if (commune) query.commune = commune;
        if (status) query.status = status;
        
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            populate: ['category', { path: 'createdBy', select: 'fullName companyName photo averageRating' }],
            sort: { createdAt: -1 }
        };

        const result = await Task.paginate(query, options);

        res.status(200).json({
            success: true,
            data: result.docs,
            pagination: {
                totalDocs: result.totalDocs,
                limit: result.limit,
                totalPages: result.totalPages,
                page: result.page,
                hasNextPage: result.hasNextPage,
                hasPrevPage: result.hasPrevPage
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single task details
// @route   GET /tasks/:id
// @access  Public
exports.getTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('category')
            .populate('createdBy', 'fullName companyName photo averageRating totalReviews')
            .populate('applicants');
            
        if (!task) return res.status(404).json({ message: "Task not found" });

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

// @desc    Update task
// @route   PUT /tasks/:id
// @access  Private (Task Owner)
exports.updateTask = async (req, res, next) => {
    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (task.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to update this task" });
        }

        task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

// @desc    Update task status
// @route   PATCH /tasks/:id/status
// @access  Private (Task Owner)
exports.updateTaskStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const task = await Task.findById(req.params.id);
        
        if (!task) return res.status(404).json({ message: "Task not found" });
        if (task.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }

        task.status = status;
        await task.save();

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete task
// @route   DELETE /tasks/:id
// @access  Private (Task Owner)
exports.deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (task.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: "Not authorized" });
        }

        await task.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};

// @desc    Get related tasks
// @route   GET /tasks/:id/related
// @access  Public
exports.getRelatedTasks = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const relatedTasks = await Task.find({
            _id: { $ne: task._id },
            category: task.category,
            status: 'open'
        }).limit(5).select('title price wilaya format category');

        res.status(200).json({ success: true, data: relatedTasks });
    } catch (error) {
        next(error);
    }
};
