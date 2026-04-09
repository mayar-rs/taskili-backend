const User = require('../models/User');
const Task = require('../models/Task');
const Application = require('../models/Application');
const Subscriber = require('../models/Subscriber');

// @desc    Get dashboard stats
// @route   GET /admin/stats
// @access  Private/Admin
exports.getStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalTasks = await Task.countDocuments();
        const activeTasks = await Task.countDocuments({ status: { $in: ['open', 'in_progress'] } });
        const totalApplications = await Application.countDocuments();

        res.status(200).json({ success: true, data: { totalUsers, totalTasks, activeTasks, totalApplications } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users
// @route   GET /admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        await user.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all tasks for moderation
// @route   GET /admin/tasks
// @access  Private/Admin
exports.getTasks = async (req, res, next) => {
    try {
        const tasks = await Task.find().populate('createdBy', 'fullName email');
        res.status(200).json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
        next(error);
    }
};

// @desc    Get newsletter subscribers
// @route   GET /admin/newsletter
// @access  Private/Admin
exports.getSubscribers = async (req, res, next) => {
    try {
        const subscribers = await Subscriber.find();
        res.status(200).json({ success: true, count: subscribers.length, data: subscribers });
    } catch (error) {
        next(error);
    }
};
