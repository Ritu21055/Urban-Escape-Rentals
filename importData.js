const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Listing = require("./models/listing.js");

// MongoDB connection URL
const MONGO_URL = "mongodb+srv://AnkitMod:ec9ObUNKLHVqgWge@ankitcluster.e47tu6x.mongodb.net/KuldeepBhaiya";

// Connect to MongoDB
mongoose.connect(MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Read the data.json file from the root directory
const dataPath = path.join(__dirname, "data.json");
const jsonData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// Function to import data
async function importData() {
  try {
    // Clear existing listings (optional)
    // await Listing.deleteMany({});
    
    // Transform the data to match the Listing schema
    const listings = jsonData.data.map(item => ({
      title: item.title,
      description: item.description,
      price: item.price || 0,
      location: item.location || "Unknown",
      country: item.country || "Unknown",
      // Handle the image field
      image: item.image ? {
        url: item.image.url,
        filename: item.image.filename
      } : {
        url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
        filename: "default-image"
      }
    }));
    
    // Insert the data into the database
    const result = await Listing.insertMany(listings);
    console.log(`Successfully imported ${result.length} listings`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error importing data:", error);
    await mongoose.connection.close();
  }
}

// Run the import function
importData(); 