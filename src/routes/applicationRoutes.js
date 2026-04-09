const express = require('express');
const router = express.Router();
const { updateApplicationStatus } = require('../controllers/applicationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.patch('/:id/status', protect, authorize('employer', 'admin'), updateApplicationStatus);

module.exports = router;
