const multer = require("multer");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("./../models/userModel.js");
const Movie = require("./../models/movieModel.js");
const authController = require("./../controllers/authController");
const path = require("path");

// const authController = require("./../controllers/authController");

// router.post("/signup", authController.signup);
// router.post("/login", authController.login);

const storage = multer.diskStorage({
  destination: "public/img/profiles",
  filename: function (req, file, cb) {
    const username = req.body.username;
    const fileExtension = path.extname(file.originalname);
    cb(null, `${username}${fileExtension}`);
  },
});
const upload = multer({ storage: storage });

router.get("/", (req, res) => {
  // Route handler logic for the GET request
  res.render("dashboard");
});

router.get("/login", (req, res) => {
  // Check if movies is defined and connected
  Movie.aggregate([{ $sample: { size: 5 } }, { $project: { id: 1, _id: 0 } }])
    .exec()
    .then((posters) => {
      res.render("login", { posters });
    })
    .catch((err) => {
      console.error("Error fetching posters:", err);
      res.send(err);
    });
});
router.post("/signup", upload.single("profile"), authController.signup);
router.post("/login", authController.login);
router.get("/dashboard/:user?", authController.protect, async (req, res) => {
  let top5Movies = await Movie.find().sort({ popularity: -1 }).limit(5).exec();
  let Movies = { top5Movies };

  if (req.params.user) {
    if (req.user) res.render("dashboard", { Movies, user: req.user });
  } else {
    res.render("dashboard", { Movies });
  }
});

router.get("/movies/:movie", (req, res) => {
  let id = req.params;
  let movie = Movie.findById(id);
  Movie.find()
    .sort({ popularity: -1 })
    .limit(5)
    .exec()
    .then((movies) => {
      if (req.cookies.jwt) {
        res.render("movie", { movie: movies, user: req.user });
      } else {
        res.render("movie", { movie: movies });
      }
    });
});

module.exports = router;
