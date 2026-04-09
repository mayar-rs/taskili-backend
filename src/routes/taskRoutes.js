const express = require('express');
const router = express.Router();
const { applyToTask, getTaskApplications } = require('../controllers/applicationController');
const {
    createTask,
    getTasks,
    getTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    getRelatedTasks
} = require('../controllers/taskController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .get(getTasks)
    .post(protect, authorize('employer'), createTask);

router.route('/:id')
    .get(getTask)
    .put(protect, authorize('employer', 'admin'), updateTask)
    .delete(protect, authorize('employer', 'admin'), deleteTask);

router.patch('/:id/status', protect, authorize('employer', 'admin'), updateTaskStatus);
router.get('/:id/related', getRelatedTasks);

// Application routes
router.post('/:id/apply', protect, authorize('freelancer'), applyToTask);
router.get('/:id/applications', protect, authorize('employer', 'admin'), getTaskApplications);

module.exports = router;
