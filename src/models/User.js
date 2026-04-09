const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional to allow OAuth
    role: { type: String, enum: ['freelancer', 'employer'], required: true },
    
    // Developer Optional Profiles
    photo: { type: String },
    bio: { type: String },
    skills: [{ type: String }],
    wilaya: { type: String },
    commune: { type: String },
    companyName: { type: String }, // For employer
    
    // Ratings
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    
    // OAuth
    googleId: { type: String },
    facebookId: { type: String },
    appleId: { type: String },
    
    // Reset/Verification Tokens
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isEmailVerified: { type: Boolean, default: false },
    verifyEmailToken: String
}, { timestamps: true });

// Password hashing
userSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
    if(!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
