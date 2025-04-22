const express = require('express');
const router = express.Router();
const Booking = require('../models/booking');

// Booking creation route
router.post('/create', async (req, res) => {
    try {
        // Verify if user is logged in
        if (!req.user) {
            return res.json({ success: false, message: 'Please login to make a booking' });
        }

        // Create new booking
        const booking = new Booking({
            listing: req.body.listingId,
            user: req.user._id,
            checkIn: req.body.checkIn,
            checkOut: req.body.checkOut,
            guests: req.body.guests,
            totalAmount: req.body.totalAmount,
            paymentId: req.body.paymentId,
            nights: req.body.nights
        });

        await booking.save();

        // You might want to update the listing's availability here

        res.json({ success: true });
    } catch (error) {
        console.error('Booking creation error:', error);
        res.json({ success: false, message: error.message });
    }
});

module.exports = router;