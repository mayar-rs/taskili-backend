const express = require('express');
const router = express.Router();
const { register, login, refreshToken, selectRole, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/select-role', protect, selectRole);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// OAuth routes placeholders (Passport will require its own config)
router.get('/google', (req, res) => res.status(501).json({ message: "OAuth not yet implemented in routes stub" }));
router.get('/facebook', (req, res) => res.status(501).json({ message: "OAuth not yet implemented in routes stub" }));
router.get('/apple', (req, res) => res.status(501).json({ message: "OAuth not yet implemented in routes stub" }));

module.exports = router;
