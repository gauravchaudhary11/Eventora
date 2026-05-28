const express = require('express');
const router = express.Router();

const { protect ,admin} = require('../middlewares/auth');
const {
    createBooking,
    getUserBookings,
    getAllBookings,
    cancelBooking,
    confirmBooking,
    rejectBooking,
    sendBookingOtp
} = require('../controllers/bookingController');


// Create a new booking
router.post('/', protect, createBooking);
router.post('/send-otp', protect, sendBookingOtp);
// Get bookings for the logged-in user
router.get('/my', protect, getUserBookings);
router.get('/', protect, admin, getAllBookings);
// Cancel a booking
router.delete('/:id', protect, cancelBooking);
// Confirm a booking (admin only)
router.put('/:id/confirm', protect, admin, confirmBooking);
router.put('/:id/reject', protect, admin, rejectBooking);

module.exports = router;
