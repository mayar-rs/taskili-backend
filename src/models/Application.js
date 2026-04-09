const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coverMessage: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });

// Ensure a freelancer can't apply twice to the same task
applicationSchema.index({ taskId: 1, freelancerId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
