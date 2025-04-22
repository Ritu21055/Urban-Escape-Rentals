const mongoose = require("mongoose");
const Listing = require("./models/listing.js");

// MongoDB connection URL
const MONGO_URL = "mongodb+srv://AnkitMod:ec9ObUNKLHVqgWge@ankitcluster.e47tu6x.mongodb.net/KuldeepBhaiya";

// Connect to MongoDB
mongoose.connect(MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Function to remove the manojsexy listing
async function removeListing() {
  try {
    // Find the listing by title
    const listing = await Listing.findOne({ title: "manojsexy" });
    
    if (listing) {
      // Delete the listing
      await Listing.findByIdAndDelete(listing._id);
      console.log(`Successfully removed listing: ${listing.title}`);
    } else {
      console.log("Listing with title 'manojsexy' not found");
    }
    
    // Close the connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error removing listing:", error);
    await mongoose.connection.close();
  }
}

// Run the remove function
removeListing(); 