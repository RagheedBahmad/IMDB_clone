const express = require("express");
const router = express.Router();
const client = require("./../index.js");
const { getDB } = require("./../database.js");

// const authController = require("./../controllers/authController");

// router.post("/signup", authController.signup);
// router.post("/login", authController.login);
const db = getDB();

const movies = db.collection("Movies");

router.get("/", (req, res) => {
  // Route handler logic for the GET request
  res.render("main");
});

router.get("/login", (req, res) => {
  // Check if movies is defined and connected
  if (!movies) {
    console.error("Movies collection is not initialized or connected.");
    return res.status(500).send("Internal Server Error");
  }

  movies
    .aggregate([{ $sample: { size: 5 } }, { $project: { id: 1, _id: 0 } }])
    .toArray()
    .then((posters) => {
      res.render("login", { posters });
    })
    .catch((err) => {
      console.error("Error fetching posters:", err);
      res.status(500).send("Internal Server Error");
    });
});

module.exports = router;
