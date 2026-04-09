const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/emailService');

// Generate JWT tokens
const generateTokens = (id) => {
    const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    // long-lived refresh token
    const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
    return { accessToken, refreshToken };
};

// @desc    Register user
// @route   POST /auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { fullName, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Initially we might just set the role to freelancer, until they hit /auth/select-role
        // or require it on registration
        const user = await User.create({
            fullName,
            email,
            password,
            // Assuming required so default freelancer, or get from req if provided
            role: req.body.role || 'freelancer' 
        });

        const { accessToken, refreshToken } = generateTokens(user._id);

        res.status(201).json({
            success: true,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
            accessToken,
            refreshToken
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password, rememberMe } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const { accessToken, refreshToken } = generateTokens(user._id);

        // Usually if rememberMe is false, you could issue a shorter refresh token or none
        res.status(200).json({
            success: true,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
            accessToken,
            refreshToken
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh token
// @route   POST /auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: "No refresh token provided" });
        }

        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) return res.status(401).json({ message: "Invalid refresh token" });

            const tokens = generateTokens(decoded.id);
            res.status(200).json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Select role after registration
// @route   POST /auth/select-role
// @access  Private
exports.selectRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!['freelancer', 'employer'].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const user = await User.findById(req.user.id);
        user.role = role;
        await user.save();

        res.status(200).json({ success: true, role: user.role });
    } catch (error) {
        next(error);
    }
};

// @desc    Forgot Password
// @route   POST /auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: "There is no user with that email" });
        }

        // Get reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save({ validateBeforeSave: false });

        const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
        const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password reset token',
                message
            });
            res.status(200).json({ success: true, data: 'Email sent' });
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ message: "Email could not be sent" });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Reset Password
// @route   PUT /auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
    try {
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid token" });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ success: true, data: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};
