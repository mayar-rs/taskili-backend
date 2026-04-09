const express = require('express');
const router = express.Router();
const { getStats, getUsers, deleteUser, getTasks, getSubscribers } = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.get('/tasks', getTasks);
// Note: router.delete('/tasks/:id') is already handled dynamically in taskRoutes if user is admin
router.get('/newsletter', getSubscribers);

module.exports = router;
