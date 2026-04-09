const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String }
}, { timestamps: true });

reviewSchema.index({ reviewerId: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
