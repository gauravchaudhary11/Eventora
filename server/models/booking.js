const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending',
    },
    paymentStatus: {
        type: String,
        enum: ['non-paid', 'paid',],
        default: 'non-paid',
    },
    paymentMethod: {
        type: String,
        enum: ['upi', 'card', 'wallet', 'cash', 'none'],
        default: 'none',
    },
    paymentReference: {
        type: String,
        default: '',
    },
    gatewayOrderId: {
        type: String,
        default: '',
    },
    gatewayPaymentId: {
        type: String,
        default: '',
    },
    totalPrice: {
        type: Number,
        required: true,
    },
},{timestamps:true});
module.exports = mongoose.model('Booking', bookingSchema);
