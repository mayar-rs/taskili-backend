const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true },
    priceType: { type: String, enum: ['per_session', 'fixed'], required: true },
    paymentMethod: { type: String },
    wilaya: { type: String, required: true },
    commune: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'completed', 'cancelled'], default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }]
}, { timestamps: true });

taskSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Task', taskSchema);
