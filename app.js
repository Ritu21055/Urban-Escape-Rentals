require('dotenv').config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const { request } = require("http");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate"); 
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const Listing = require("./models/listing.js");
const multer = require('multer');
const fs = require('fs').promises;

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const dataRouter = require("./routes/data.js");
const paymentRouter = require("./routes/payment.js");  // Add this line
const bookingRoutes = require('./routes/bookings');


// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/urbanescaperentals";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
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

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // 5 second timeout
        });
        console.log("Connected to MongoDB");
        console.log("MongoDB Connection Status:", mongoose.connection.readyState);
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        process.exit(1); // Exit if cannot connect to database
    }
}

// Connect to MongoDB
connectDB();

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const sessionOptions = {
    secret: "mysupersecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));  

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})

// Make upload middleware available to routes
app.locals.upload = upload;

const validateListing = (req,res,next) =>{
    let {error} =  listingSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el)=>el.message).join(",");
       throw  new ExpressError(400,errMsg);
    }else{
        next();
    }
}

// Root route redirects to data page
app.get("/", (req, res) => {
    res.redirect("/data");
});

// Register routes in correct order
app.use("/", userRouter);
app.use("/data", dataRouter);
app.use("/payment", paymentRouter);
app.use('/bookings', bookingRoutes);

// Comment out or remove the rental property routes
// app.use("/listings", listingRouter);
// app.use("/listings/:id/reviews", reviewRouter);

// 404 handler for unmatched routes
app.all("*", (req, res, next) => {
    console.log("404 Error - Route not found:", req.originalUrl);
    console.log("Request Method:", req.method);
    console.log("Request Path:", req.path);
    console.log("Request Body:", req.body);
    req.flash('error', 'Page not found!');
    res.redirect('/data');
});

// Error handler
app.use((err, req, res, next) => {
    console.error("🔥 Error Middleware Triggered!");
    console.error("Error Stack:", err.stack);
    console.error("Error Message:", err.message);
    console.error("Request Body:", req.body);
    
    req.flash('error', err.message || 'Something went wrong');
    res.redirect('/data');
});

app.listen(9000, () => {
    console.log("Server is running on port 9000");
});
