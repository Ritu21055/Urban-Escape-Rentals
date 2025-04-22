const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listing.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

/**
 * ✅ Place fixed path FIRST: /new before /:id
 */
router.get("/new", isLoggedIn, listingController.renderNewForm);

/**
 * ✅ All listings or create new one
 */
router.route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

/**
 * ✅ Edit form must also come BEFORE :id route
 */
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

/**
 * ✅ Add regex to match valid MongoDB ObjectId only
 */
router.route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

module.exports = router;
