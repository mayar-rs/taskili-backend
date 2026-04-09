const Application = require('../models/Application');
const Task = require('../models/Task');

// @desc    Apply mapping task
// @route   POST /tasks/:id/apply
// @access  Private (Freelancer only)
exports.applyToTask = async (req, res, next) => {
    try {
        const taskId = req.params.id;
        const freelancerId = req.user.id;
        const { coverMessage } = req.body;

        if (req.user.role !== 'freelancer') {
            return res.status(403).json({ message: "Only freelancers can apply to tasks" });
        }

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Check if task is open
        if (task.status !== 'open') {
            return res.status(400).json({ message: "This task is no longer open for applications" });
        }

        // Check if already applied
        const existingApp = await Application.findOne({ taskId, freelancerId });
        if (existingApp) {
            return res.status(400).json({ message: "You have already applied to this task" });
        }

        const application = await Application.create({
            taskId,
            freelancerId,
            coverMessage
        });

        // Add application to task list
        task.applicants.push(application._id);
        await task.save();

        res.status(201).json({ success: true, data: application });
    } catch (error) {
        next(error);
    }
};

// @desc    Get applicants for a task
// @route   GET /tasks/:id/applications
// @access  Private (Employer Owner)
exports.getTaskApplications = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (task.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to view these applications" });
        }

        const applications = await Application.find({ taskId: req.params.id })
            .populate('freelancerId', 'fullName photo averageRating utils skills wilaya commune');

        res.status(200).json({ success: true, count: applications.length, data: applications });
    } catch (error) {
        next(error);
    }
};

// @desc    Patch application status
// @route   PATCH /applications/:id/status
// @access  Private (Employer Owner of Task)
exports.updateApplicationStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const application = await Application.findById(req.params.id).populate('taskId');
        if (!application) return res.status(404).json({ message: "Application not found" });

        if (application.taskId.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }

        application.status = status;
        await application.save();

        // If accepted, change task status
        if (status === 'accepted') {
            const task = await Task.findById(application.taskId._id);
            task.status = 'in_progress';
            await task.save();
        }

        res.status(200).json({ success: true, data: application });
    } catch (error) {
        next(error);
    }
};

// @desc    Get my applications
// @route   GET /users/me/applications
// @access  Private (Freelancer)
exports.getMyApplications = async (req, res, next) => {
    try {
        const applications = await Application.find({ freelancerId: req.user.id })
            .populate({ path: 'taskId', populate: { path: 'createdBy', select: 'fullName companyName' } });

        res.status(200).json({ success: true, count: applications.length, data: applications });
    } catch (error) {
        next(error);
    }
};
