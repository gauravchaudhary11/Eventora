const Booking = require('../models/booking');
const Otp = require('../models/otp');
const Event = require('../models/event');
const { sendEmail, sendBookingEmail, sendOtpEmail } = require('../utils/email');
const mongoose = require('mongoose');

const generateOtp=()=>{
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const getConfirmedBookingCount = async (eventId) => Booking.countDocuments({
    eventId,
    status: 'confirmed'
});

const syncEventAvailableSeats = async (eventId) => {
    const event = await Event.findById(eventId);
    if (!event) return null;

    const confirmedBookings = await getConfirmedBookingCount(event._id);
    event.availableSeats = Math.max(event.totalSeats - confirmedBookings, 0);
    await event.save();
    return event;
};

exports.sendBookingOtp = async (req, res) => {
    const otp = generateOtp();
    await Otp.findOneAndDelete({
        email: req.user.email,
        action: 'event_booking'
    });

    await Otp.create({ email: req.user.email, otp, action: 'event_booking' });
    await sendOtpEmail(req.user.email, otp, 'event_booking');
    res.json({ message: 'OTP sent to email' });
};



exports.createBooking = async (req, res) => {
    const { eventId, otp } = req.body;
    const otpRecord = await Otp.findOne({
        email: req.user.email,
        otp: otp?.toString().trim(),
        action: 'event_booking'
    });

    if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid OTP' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    if (event.availableSeats <= 0) {
        return res.status(400).json({ message: 'No seats available' });
    }

    const existingBooking = await Booking.findOne({ userId: req.user._id, eventId });
    if(existingBooking){
        return res.status(400).json({message:'You have already booked this event'});
    }

    const booking = await Booking.create({
        userId: req.user._id,
        eventId,
        totalPrice: event.price,
        paymentStatus: 'non-paid',
        paymentMethod: 'none',
        paymentReference: ''
    });

    await syncEventAvailableSeats(event._id);

    await Otp.deleteMany({ email: req.user.email, action: 'event_booking' });
    try {
        await sendBookingEmail(req.user.email, event.title, booking._id);
    } catch (err) {
        console.error('Booking notification failed:', err);
    }

    res.status(201).json({ message: 'Booking request submitted', bookingId: booking._id, booking });
};




exports.confirmBooking = async (req, res) => {
    const paymentstatus = req.body.paymentstatus || req.body.paymentStatus;
    if (paymentstatus && !['paid','non-paid'].includes(paymentstatus)) {
        return res.status(400).json({message:'Invalid payment status'});
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const booking = await Booking.findById(req.params.id).session(session);
            if (!booking) {
                const err = new Error('Booking not found');
                err.statusCode = 404;
                throw err;
            }
            if (booking.status === 'confirmed') {
                const err = new Error('Booking already confirmed');
                err.statusCode = 400;
                throw err;
            }

            const event = await Event.findOneAndUpdate(
                { _id: booking.eventId, availableSeats: { $gt: 0 } },
                { $inc: { availableSeats: -1 } },
                { new: true, session }
            );
            if (!event) {
                const err = new Error('No seats available');
                err.statusCode = 400;
                throw err;
            }

            booking.status = 'confirmed';
            booking.paymentStatus = paymentstatus || booking.paymentStatus;
            await booking.save({ session });
        });

        const booking = await Booking.findById(req.params.id)
            .populate('eventId')
            .populate('userId');

        if (booking?.userId?.email) {
            try {
                await sendEmail(booking.userId.email, 'Booking Confirmed', `Your booking for ${booking.eventId.title} has been confirmed. Booking ID: ${booking._id}`);
            } catch (err) {
                console.error('Booking confirmation email failed:', err);
            }
        }

        res.json({ message: 'Booking confirmed', booking });
    } catch (err) {
        console.error(err);
        res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
    } finally {
        session.endSession();
    }
};

exports.getAllBookings = async (_req, res) => {
    try {
        const bookings = await Booking.find({})
            .populate('eventId')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('eventId')
            .populate('userId');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking already rejected' });
        }

        booking.status = 'cancelled';
        await booking.save();
        await syncEventAvailableSeats(booking.eventId?._id || booking.eventId);

        if (booking.userId?.email) {
            await sendEmail(
                booking.userId.email,
                'Booking Rejected',
                `Your booking for ${booking.eventId?.title || 'the event'} could not be approved. Booking ID: ${booking._id}`
            );
        }

        res.json({ message: 'Booking rejected', booking });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getUserBookings = async (req, res) => {
    const bookings = await Booking.find({ userId: req.user._id })
        .populate('eventId')
        .sort({ createdAt: -1 });
    res.json(bookings);
};

exports.cancelBooking = async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('eventId');
    if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    await Booking.findByIdAndDelete(req.params.id);
    await syncEventAvailableSeats(booking.eventId?._id || booking.eventId);
    res.json({ message: 'Booking cancelled' });
};
