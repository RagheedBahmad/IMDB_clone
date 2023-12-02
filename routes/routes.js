const multer = require("multer");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("./../models/userModel.js");
const Movie = require("./../models/movieModel.js");
const authController = require("./../controllers/authController");
const movieController = require("./../controllers/movieController");
const userController = require("./../controllers/userController");
const path = require("path");
const { google } = require("googleapis");
const passport = require("passport");
const { body, validationResult } = require("express-validator");
let top10Movies;
async function getPopular() {
  top10Movies = await movieController.top(10);
}
getPopular();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/img/profiles");
  },
  filename: function (req, file, cb) {
    let filename = req.body.username + path.extname(file.originalname);
    cb(null, filename);
  },
});
const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 } });

router.get("/privacy", (req, res) => {
  res.render("privacyPolicy");
});
router.get("/", authController.protect, async (req, res) => {
  let random3Movies = await movieController.random(3);
  let recentMovies = await movieController.recent(5);
  res.render("dashboard", {
    top10Movies,
    random3Movies,
    recentMovies,
    user: req.user ? req.user : null,
    watchlist: req.user ? req.user.watchlist : null,
    isAuthenticated: !!req.user,
  });
});

router.get("/login", async (req, res) => {
  let posters = await movieController.random(5);
  res.render("login", { posters, googleClientId: process.env.CLIENT_ID });
});
router.get("/forgot-password", (req, res) => {
  res.render("forgotPassword");
});
router.post("/signup", upload.single("profile"), authController.signup);
router.post("/login", authController.login);
router.get("/signout", authController.signout);
router.get("/dashboard", authController.protect, async (req, res) => {
  let random3Movies = await movieController.random(3);
  let recentMovies = await movieController.recent(5);
  res.render("dashboard", {
    top10Movies,
    random3Movies,
    recentMovies,
    user: req.user ? req.user : null,
    watchlist: req.user ? req.user.watchlist : null,
    isAuthenticated: !!req.user,
  });
});

router.post("/watchlist", userController.addWatchlist, (req, res) => {});
router.post(
  "/remove-watchlist",
  userController.removeWatchlist,
  (req, res) => {}
);

router.get("/movies/:movie", authController.protect, async (req, res) => {
  let id = req.params.movie;
  let movie = await Movie.findOne({ id: id }).exec();
  let similarMovies = movieController.similar(movie.original_title);
  console.log(similarMovies);
  res.render("movie", {
    movie,
    similarMovies,
    user: req.user ? req.user : null,
    watchlist: req.user ? req.user.watchlist : null,
    isAuthenticated: !!req.user,
  });
});

async function verify(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience:
      "660822408267-3841276aurp61khq91arj2k7k5j1ptsq.apps.googleusercontent.com",
  });
  const payload = ticket.getPayload();
  const userid = payload["sub"];
  // If request specified a G Suite domain:
  // const domain = payload['hd'];
  return payload;
}
router.post("/auth/google", authController.googleAuth, (req, res) => {
  res.status(200).json({ user: req.user, message: "Authenticated" });
});

router.get("/oauth2/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const userInfo = await handleOAuthCallback(code);

    if (userInfo.verified_email) {
    }
    // Use userInfo in your application logic

    res.redirect(`/dashboard/${userInfo.name}`);
  } catch (error) {
    res.status(500).send("Authentication error");
  }
});

async function handleOAuthCallback(code) {
  // Exchange the code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Now you can use oauth2Client to fetch the user's profile information
  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: "v2",
  });

  const userInfoResponse = await oauth2.userinfo.get();
  return userInfoResponse.data; // This will contain the user's profile information
}

router.post(
  "/forgot-password",
  authController.forgotPassword,
  (req, res) => {}
);
router.get("/forgot-password/:token", authController.validateEmailToken);

router.post("/resetPassword", authController.resetPassword);

router.get("/profile/:user", authController.protect, async (req, res) => {
  res.render("user", { user: req.user });
});

router.get(
  "/search",
  movieController.search,
  authController.protect,
  async (req, res) => {
    console.log(res.similarMovies);
    let randomMovies = await movieController.random(5);
    res.render("search", {
      movies: res.movies,
      similarMovies: res.similarMovies,
      randomMovies,
      user: req.user ? req.user : null,
      watchlist: req.user ? req.user.watchlist : null,
      isAuthenticated: !!req.user,
      searchQuery: req.query.q,
    });
  }
);

router.post(
  "/api/search",
  body("query").trim().escape(),
  movieController.regexSearch,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    res.json({ movies: res.movies });
  }
);

module.exports = router;
