const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Get workspace root path
const workspaceRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "..", "public", "uploads");
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Helper function to read data
async function readData() {
  try {
    const dataPath = path.join(__dirname, "..", "..", "..", "..", "NotMlne with Chatbot", "data.json");
    console.log('Reading data from:', dataPath);
    const data = await fs.promises.readFile(dataPath, 'utf8');
    const parsedData = JSON.parse(data);
    console.log('Number of listings loaded:', parsedData.data.length);
    return parsedData;
  } catch (error) {
    console.error('Error reading data:', error);
    throw error;
  }
}

// Helper function to write data
async function writeData(data) {
  try {
    const dataPath = path.join(__dirname, "..", "..", "..", "..", "NotMlne with Chatbot", "data.json");
    console.log('Writing data to:', dataPath);
    await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data:', error);
    throw error;
  }
}

// Render main data view
async function renderData(req, res) {
  try {
    const data = await readData();
    console.log('Total listings in data.json:', data.data.length);
    
    // Get search query from request
    const searchQuery = req.query.search || '';
    let listings = data.data;

    // Filter listings if search query exists
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      listings = listings.filter(listing => 
        listing.title.toLowerCase().includes(query) ||
        listing.location.toLowerCase().includes(query) ||
        listing.country.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query)
      );
    }

    // Add index to each listing
    listings = listings.map((listing, index) => ({
      ...listing,
      index: index
    }));

    console.log('Number of listings being passed to template:', listings.length);

    res.render('data/index', {
      title: 'All Listings',
      listings: listings,
      searchQuery: searchQuery,
      noResults: listings.length === 0,
      currentUser: req.user // Add currentUser to the template data
    });
  } catch (error) {
    console.error('Error reading data:', error);
    console.error('Error details:', error.message);
    req.flash('error', 'Error loading listings');
    res.redirect('/');
  }
}

// Search listings
async function searchListings(req, res) {
  try {
    const { query } = req.query;
    if (!query) {
      return res.redirect('/data');
    }

    const data = await readData();
    const searchQuery = query.trim().toLowerCase();
    
    const filteredListings = data.data.filter(listing => {
      const searchableFields = [
        listing.title,
        listing.location,
        listing.country,
        listing.description,
        listing.price.toString()
      ];
      return searchableFields.some(field => 
        field.toLowerCase().includes(searchQuery)
      );
    });

    res.render('data/index', {
      title: 'Search Results',
      listings: filteredListings,
      searchQuery: query,
      noResults: filteredListings.length === 0
    });
  } catch (error) {
    console.error('Error searching listings:', error);
    req.flash('error', 'Error searching listings');
    res.redirect('/data');
  }
}

// Render individual listing
async function renderListing(req, res) {
  try {
    const { id } = req.params;
    console.log('Looking for listing with ID:', id);
    
    const data = await readData();
    console.log('Available listings:', data.data.map((l, index) => ({ id: index, title: l.title })));
    
    // Find the listing by index (ID)
    const listingIndex = parseInt(id);
    const listing = data.data[listingIndex];
    
    if (!listing) {
      console.log('Listing not found with ID:', id);
      req.flash('error', 'Listing not found');
      return res.redirect('/data');
    }

    // Ensure the listing has all required properties
    const fullListing = {
      ...listing,
      index: listingIndex,
      maxGuests: listing.maxGuests || 10,
      reviews: listing.reviews || [],
      image: listing.image || { url: '/images/default-property.jpg' }
    };

    console.log('Found listing:', fullListing);
    res.render('data/show', { 
      listing: fullListing,
      currentUser: req.user // Pass the current user to the template
    });
  } catch (error) {
    console.error('Error rendering listing:', error);
    req.flash('error', 'Error loading listing');
    res.redirect('/data');
  }
}

// Render new listing form
function renderNewForm(req, res) {
  res.render('data/new');
}

// Create new listing
async function createListing(req, res) {
  try {
    const data = await readData();
    
    // Handle file upload
    if (!req.file) {
      req.flash('error', 'Please upload an image');
      return res.redirect('/data/new');
    }

    const newListing = {
      title: req.body.title,
      price: parseFloat(req.body.price),
      location: req.body.location,
      country: req.body.country,
      description: req.body.description,
      image: {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename
      },
      owner: req.user.username,
      reviews: []
    };
    
    data.data.push(newListing);
    await writeData(data);
    
    req.flash('success', 'Successfully created a new listing!');
    res.redirect('/data');
  } catch (error) {
    console.error('Error creating listing:', error);
    req.flash('error', 'Error creating listing');
    res.redirect('/data/new');
  }
}

// Render edit form
async function renderEditForm(req, res) {
  try {
    const { id } = req.params;
    const data = await readData();
    const listing = data.data.find(item => item.id === id);
    
    if (!listing) {
      req.flash('error', 'Listing not found');
      return res.redirect('/data');
    }

    res.render('data/edit', { listing });
  } catch (error) {
    console.error('Error rendering edit form:', error);
    req.flash('error', 'Error loading listing');
    res.redirect('/data');
  }
}

// Update listing
async function updateListing(req, res) {
  try {
    const { id } = req.params;
    const data = await readData();
    const listing = data.data.find(item => item.id === id);
    
    if (!listing) {
      req.flash('error', 'Listing not found');
      return res.redirect('/data');
    }

    // Check if user is the owner
    if (listing.owner !== req.user.username) {
      req.flash('error', 'You are not authorized to edit this listing');
      return res.redirect('/data');
    }

    // Update listing
    listing.title = req.body.title;
    listing.price = parseFloat(req.body.price);
    listing.location = req.body.location;
    listing.country = req.body.country;
    listing.description = req.body.description;

    // Update image if new one is uploaded
    if (req.file) {
      listing.image = {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename
      };
    }

    await writeData(data);
    req.flash('success', 'Successfully updated listing!');
    res.redirect(`/data/${encodeURIComponent(listing.id)}`);
  } catch (error) {
    console.error('Error updating listing:', error);
    req.flash('error', 'Error updating listing');
    res.redirect(`/data/${encodeURIComponent(req.params.id)}/edit`);
  }
}

// Delete listing
async function deleteListing(req, res) {
  try {
    const { id } = req.params;
    const data = await readData();
    const listing = data.data.find(item => item.id === id);
    
    if (!listing) {
      req.flash('error', 'Listing not found');
      return res.redirect('/data');
    }

    // Check if user is the owner
    if (listing.owner !== req.user.username) {
      req.flash('error', 'You are not authorized to delete this listing');
      return res.redirect('/data');
    }

    data.data = data.data.filter(item => item.id !== id);
    await writeData(data);
    
    req.flash('success', 'Successfully deleted listing!');
    res.redirect('/data');
  } catch (error) {
    console.error('Error deleting listing:', error);
    req.flash('error', 'Error deleting listing');
    res.redirect('/data');
  }
}

// Function to create a review
const createReview = async (req, res) => {
  try {
    const data = await readData();
    const listing = data.data.find(item => item.id === req.params.id);
    
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/data");
    }

    // Initialize reviews array if it doesn't exist
    if (!listing.reviews) {
      listing.reviews = [];
    }

    // Create new review with reviewer's name
    const newReview = {
      id: Date.now().toString(), // Unique ID for the review
      rating: parseInt(req.body.rating),
      comment: req.body.comment,
      reviewer: req.user ? req.user.username : 'Anonymous',
      createdAt: new Date().toISOString()
    };

    listing.reviews.push(newReview);
    await writeData(data);

    req.flash("success", "Successfully added review!");
    res.redirect(`/data/${encodeURIComponent(listing.id)}`);
  } catch (error) {
    console.error("Error creating review:", error);
    req.flash("error", "Error creating review");
    res.redirect(`/data/${encodeURIComponent(req.params.id)}`);
  }
};

// Function to delete a review
const deleteReview = async (req, res) => {
  try {
    const data = await readData();
    const listing = data.data.find(item => item.id === req.params.id);
    
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/data");
    }

    // Find and remove the review
    const reviewIndex = listing.reviews.findIndex(review => review.id === req.params.reviewId);
    if (reviewIndex === -1) {
      req.flash("error", "Review not found");
      return res.redirect(`/data/${encodeURIComponent(listing.id)}`);
    }

    // Check if the user is authorized to delete the review
    const review = listing.reviews[reviewIndex];
    if (req.user && (req.user.username === review.reviewer || req.user.isAdmin)) {
      listing.reviews.splice(reviewIndex, 1);
      await writeData(data);
      req.flash("success", "Successfully deleted review!");
    } else {
      req.flash("error", "You are not authorized to delete this review");
    }

    res.redirect(`/data/${encodeURIComponent(listing.id)}`);
  } catch (error) {
    console.error("Error deleting review:", error);
    req.flash("error", "Error deleting review");
    res.redirect(`/data/${encodeURIComponent(req.params.id)}`);
  }
};

// Book property
async function bookProperty(req, res) {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, guests } = req.body;
    
    const data = await readData();
    const listing = data.data.find(item => item.id === id);
    
    if (!listing) {
      req.flash('error', 'Listing not found');
      return res.redirect('/data');
    }

    // Initialize bookings array if it doesn't exist
    if (!listing.bookings) {
      listing.bookings = [];
    }

    // Create new booking
    const newBooking = {
      id: Date.now().toString(),
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: parseInt(guests),
      user: req.user ? req.user.username : 'Guest',
      createdAt: new Date()
    };

    // Add booking to the listing
    listing.bookings.push(newBooking);
    await writeData(data);

    req.flash('success', 'Property booked successfully!');
    res.redirect(`/data/${encodeURIComponent(listing.id)}`);
  } catch (error) {
    console.error('Error booking property:', error);
    req.flash('error', 'Error booking property');
    res.redirect(`/data/${encodeURIComponent(req.params.id)}`);
  }
}

// Define routes in correct order
router.get("/new", renderNewForm);
router.get("/search", searchListings);
router.get("/:id/edit", renderEditForm);
router.get("/:id", renderListing);
router.get("/", renderData);

router.post("/", upload.single('image'), createListing);
router.put("/:id", upload.single('image'), updateListing);
router.delete("/:id", deleteListing);
router.post("/:id/reviews", createReview);
router.delete("/:id/reviews/:reviewId", deleteReview);
router.post("/:id/book", bookProperty);

module.exports = router; 