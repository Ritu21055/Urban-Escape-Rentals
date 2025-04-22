const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/urbanescaperentals";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to DB");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1); // Exit if connection fails
  }
};

const initDB = async () => {
  try {
    await Listing.deleteMany({});
    // initData.data= initData.data.map((obj)=>({...obj,owner:"67e2c203f83ebb2997670899"}));
    const ownerId = new mongoose.Types.ObjectId("67e2c203f83ebb2997670899"); // Convert to ObjectId

    
    
    

    const listings = initData.data.map((item) => ({
      title: item.title,
      description: item.description,
      image: item.image?.url || "", // Ensure `image.url` exists
      price: item.price,
      location: item.location,
      country: item.country,
      
      
    }));
    // initData.data= initData.data.map((obj)=>({...obj,owner:"67e2c203f83ebb2997670899"}))

    console.log(listings);
    
    await Listing.insertMany(listings);
    console.log("Data was initialized successfully.");
  } catch (err) {
    console.error("Error initializing data:", err.message);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await initDB();
};

run();
