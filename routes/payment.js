const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware');
const Payment = require('../models/payment');
const Listing = require('../models/listing');
const Booking = require('../models/booking');
const path = require('path');
const fs = require('fs').promises;

// Helper function to read data
async function readData() {
    try {
        const dataPath = path.join(__dirname, "..", "..", "..", "NotMlne with Chatbot", "data.json");
        const data = await fs.promises.readFile(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        throw error;
    }
}

// Show payment page
router.get('/checkout/:listingId', isLoggedIn, async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.listingId);
        if (!listing) {
            req.flash('error', 'Listing not found');
            return res.redirect('/data');
        }
        res.render('payment/checkout', { listing });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong');
        res.redirect('/data');
    }
});

// Process payment
router.post('/process', isLoggedIn, async (req, res) => {
    try {
        console.log('Payment process started');
        console.log('Request body:', req.body);
        console.log('Request path:', req.path);
        console.log('Request method:', req.method);
        console.log('User:', req.user);

        const { 
            listingId, 
            listingTitle,
            listingPrice,
            paymentMethod, 
            bankName, 
            accountNumber, 
            ifscCode, 
            upiId,
            checkIn,
            checkOut,
            guests
        } = req.body;

        // Validate required fields
        if (!listingId || !paymentMethod || !checkIn || !checkOut || !guests) {
            console.log('Missing required fields:', { listingId, paymentMethod, checkIn, checkOut, guests });
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/data');
        }

        // Validate payment method specific fields
        if (paymentMethod === 'bank_transfer') {
            if (!bankName || !accountNumber || !ifscCode) {
                console.log('Missing bank details:', { bankName, accountNumber, ifscCode });
                req.flash('error', 'Please provide all bank details');
                return res.redirect('/data');
            }
        } else if (paymentMethod === 'upi') {
            if (!upiId) {
                console.log('Missing UPI ID');
                req.flash('error', 'Please provide UPI ID');
                return res.redirect('/data');
            }
        }

        // Convert dates to proper format
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        // Validate dates
        if (checkInDate >= checkOutDate) {
            console.log('Invalid dates:', { checkInDate, checkOutDate });
            req.flash('error', 'Check-out date must be after check-in date');
            return res.redirect('/data');
        }

        // Calculate number of nights and total amount
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const totalAmount = nights * parseFloat(listingPrice);

        console.log('Creating payment record');
        // Create payment record
        const payment = new Payment({
            user: req.user._id,
            listing: listingId,
            amount: totalAmount,
            paymentMethod,
            paymentDetails: {
                bankName: paymentMethod === 'bank_transfer' ? bankName : undefined,
                accountNumber: paymentMethod === 'bank_transfer' ? accountNumber : undefined,
                ifscCode: paymentMethod === 'bank_transfer' ? ifscCode : undefined,
                upiId: paymentMethod === 'upi' ? upiId : undefined
            },
            bookingDetails: {
                checkIn: checkInDate,
                checkOut: checkOutDate,
                guests: parseInt(guests),
                nights: nights
            },
            status: 'completed',
            transactionId: 'TXN' + Date.now()
        });
        
        await payment.save();
        console.log('Payment record created');

        console.log('Creating booking record');
        // Create booking record
        const booking = new Booking({
            listing: listingId,
            user: req.user._id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: parseInt(guests),
            totalAmount: totalAmount,
            paymentId: payment._id,
            nights: nights,
            status: 'confirmed'
        });

        await booking.save();
        console.log('Booking record created');

        req.flash('success', 'Payment successful! Your booking has been confirmed.');
        console.log('Redirecting to success page');
        res.redirect('/payment/success');
    } catch (err) {
        console.error('Payment Error:', err);
        console.error('Error Stack:', err.stack);
        req.flash('error', 'Payment failed. Please try again or contact support.');
        res.redirect('/data');
    }
});

// Success page
router.get('/success', isLoggedIn, (req, res) => {
    console.log('Rendering success page');
    res.render('payment/success');
});

// Cancel page
router.get('/cancel', isLoggedIn, (req, res) => {
    res.render('payment/cancel');
});

module.exports = router;