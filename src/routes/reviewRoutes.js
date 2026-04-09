const express = require('express');
const router = express.Router();
const { addReview, getUserReviews } = require('../controllers/reviewController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, addReview);

// The get reviews endpoint is usually a subroute to users, but we can mount it here
// and import into userRoutes or access via /reviews/user/:id directly. We will mount it on userRoutes.
// router.get('/user/:id', getUserReviews);

module.exports = router;
