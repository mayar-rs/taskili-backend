const Review = require('../models/Review');
const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Add review
// @route   POST /reviews
// @access  Private (Freelancer or Employer)
exports.addReview = async (req, res, next) => {
    try {
        req.body.reviewerId = req.user.id;
        const { revieweeId, taskId, rating, comment } = req.body;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (task.status !== 'completed') {
            return res.status(400).json({ message: "Review can only be submitted for completed tasks" });
        }

        // Verify that the user was involved in the task
        const isEmployer = task.createdBy.toString() === req.user.id;
        const application = await require('../models/Application').findOne({ taskId, status: 'accepted' });
        
        let involvedFreelancerId = null;
        if (application) {
            involvedFreelancerId = application.freelancerId.toString();
        }

        const isFreelancer = involvedFreelancerId === req.user.id;

        if (!isEmployer && !isFreelancer) {
            return res.status(403).json({ message: "Not authorized to review this task" });
        }

        const review = await Review.create(req.body);

        // Update Average Rating
        const reviews = await Review.find({ revieweeId });
        const avg = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
        
        await User.findByIdAndUpdate(revieweeId, {
            averageRating: avg.toFixed(1),
            totalReviews: reviews.length
        });

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "You have already reviewed this task" });
        }
        next(error);
    }
};

// @desc    Get user reviews
// @route   GET /users/:id/reviews
// @access  Public
exports.getUserReviews = async (req, res, next) => {
    try {
        const reviews = await Review.find({ revieweeId: req.params.id })
            .populate('reviewerId', 'fullName photo')
            .populate('taskId', 'title');

        res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        next(error);
    }
};
