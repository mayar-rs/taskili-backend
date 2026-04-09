const User = require('../models/User');

// @desc    Get public profile
// @route   GET /users/:id
// @access  Public
exports.getPublicProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpire');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// @desc    Update own profile
// @route   PUT /users/me
// @access  Private
exports.updateProfile = async (req, res, next) => {
    try {
        const updates = req.body;
        // Don't allow password or role update through this route
        delete updates.password;
        delete updates.role;
        
        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true
        }).select('-password');
        
        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload profile photo
// @route   POST /users/me/photo
// @access  Private
exports.uploadPhoto = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload an image" });
        }

        const user = await User.findById(req.user.id);
        user.photo = `/uploads/${req.file.filename}`;
        await user.save();

        res.status(200).json({ success: true, photo: user.photo });
    } catch (error) {
        next(error);
    }
};

// @desc    Browse freelancers
// @route   GET /freelancers
// @access  Public
exports.getFreelancers = async (req, res, next) => {
    try {
        const { wilaya, commune, skills, minRating, page = 1, limit = 10 } = req.query;
        let query = { role: 'freelancer' };

        if (wilaya) query.wilaya = wilaya;
        if (commune) query.commune = commune;
        if (skills) query.skills = { $in: skills.split(',') };
        if (minRating) query.averageRating = { $gte: Number(minRating) };

        // For simplicity we use standard query limit/skip here, or pagination plugin
        const skip = (page - 1) * limit;

        const freelancers = await User.find(query).select('-password').skip(skip).limit(Number(limit));
        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            count: freelancers.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: freelancers
        });
    } catch (error) {
        next(error);
    }
};
