const express = require('express');
const router = express.Router();
const { getPublicProfile, updateProfile, uploadPhoto, getFreelancers } = require('../controllers/userController');
const { getMyApplications } = require('../controllers/applicationController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Get freelancers (Public)
router.get('/freelancers', getFreelancers);

// Get freelancers (Public)
router.get('/freelancers', getFreelancers);

// Route ordering: Specific first, params later
router.get('/me/applications', protect, authorize('freelancer'), getMyApplications);
router.put('/me', protect, updateProfile);
router.post('/me/photo', protect, upload.single('photo'), uploadPhoto);
router.get('/:id', getPublicProfile);

// For /freelancers/:id it is essentially handled by /:id as public profile view
router.get('/freelancer/:id', getPublicProfile);

module.exports = router;
