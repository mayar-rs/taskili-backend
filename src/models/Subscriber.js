const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);
