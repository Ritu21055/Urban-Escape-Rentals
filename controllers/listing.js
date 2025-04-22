const Listing = require("../models/listing");

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  console.log("Render new form called");
  res.render("listings/new.ejs");
};

module.exports.createListing = async (req, res) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
  
    if (req.file) {
      const { path, filename } = req.file;
      newListing.image = { url: path, filename };
    }
  
    await newListing.save();
    req.flash("success", "New Listing created!");
    res.redirect(`/listings/${newListing._id}`);
  };
  

module.exports.showListing = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID before querying MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash("error", "Invalid listing ID");
      return res.redirect("/listings");
    }

    const listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: { path: "author" }
      })
      .populate("owner");
      console.log("Listing found:", listing);

    if (!listing) {
      req.flash("error", "Listing you requested does not exist!");
      return res.redirect("/listings");
    }

    res.render("listings/show.ejs", { listing, currUser: req.user });
  } catch (err) {
    console.error("Error fetching listing:", err);
    req.flash("error", "Something went wrong!");
    res.redirect("/listings");
  }
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (req.file) {
    const { path, filename } = req.file;
    listing.image = { url: path, filename };
    await listing.save();
  }

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("failure", "Listing Deleted!");
  res.redirect("/listings");
};
