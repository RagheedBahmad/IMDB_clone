const multer = require("multer");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("./../models/userModel.js");
const Movie = require("./../models/movieModel.js");
const Actor = require("./../models/actorModel.js");
const authController = require("./../controllers/authController");
const movieController = require("./../controllers/movieController");
const actorController = require("./../controllers/actorController");
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
    cb(null, "./public/img/profiles"); // Ensure this path exists
  },
  filename: function (req, file, cb) {
    let filename = req.body.username + path.extname(file.originalname);
    cb(null, filename);
  },
});
const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 } });

router.get("/privacy", authController.protect, (req, res) => {
  res.render("privacyPolicy", {
    user: req.user ? req.user : null,
    watchlist: req.user ? req.user.watchlist : null,
    isAuthenticated: !!req.user,
  });
});
router.get("/conditions", authController.protect, (req, res) => {
  res.render("conditions", {
    user: req.user ? req.user : null,
    watchlist: req.user ? req.user.watchlist : null,
    isAuthenticated: !!req.user,
  });
});
router.get("/press", authController.protect, (req, res) => {
  res.render("press", {
    user: req.user ? req.user : null,
    watchlist: req.user ? req.user.watchlist : null,
    isAuthenticated: !!req.user,
  });
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
  console.log(movie);
  let similarMovies = movieController.similar(movie.original_title);
  const actorIds = movie.credits.cast.map((actor) => actor.id).slice(0, 10);
  const actorsData = await Actor.find({ id: { $in: actorIds } }).exec();

  // const actors = actorIds.map(actorId => actorss.find(actor => actor.id === actorId));

  const actors = actorIds.map((actorId) => {
    const actorData = actorsData.find((actor) => actor.id === actorId);
    const characterName =
      movie.credits.cast.find((actor) => actor.id === actorId)?.character ||
      "Unknown Character";

    return {
      ...actorData.toObject(),
      character: characterName,
    };
  });

  res.render("movie", {
    movie: movie,
    actors,
    similarMovies,
    reviews: req.user ? req.user.reviews : null,
    user: req.user ? req.user : null,
    watchlist: req.user ? req.user.watchlist : null,
    isAuthenticated: !!req.user,
  });
});
router.get(
  "/actors/:id",
  authController.protect,
  actorController.getActorDetails
);

router.post(
  "/movies/:movieId/reviews",
  authController.protect,
  async (req, res) => {
    try {
      // Access authenticated user
      const user = req.user;

      // Check if user is authenticated
      if (!user) {
        return res.redirect("/login");
      }

      const { title, review, rating } = req.body;

      const movieId = req.params.movieId;

      // Find the movie based on the movieId
      const movie = await Movie.findOne({ id: movieId }).exec();

      // Check if the movie exists
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      const newReview = {
        movieId,
        title,
        review,
        rating,
      };

      await User.updateOne(
        { email: user.email },
        { $addToSet: { reviews: newReview } }
      );

      res.redirect(`/movies/${movieId}`);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

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

router.get("/profile", authController.protect, async (req, res) => {
  res.render("user", {
    user: req.user,
    isAuthenticated: !!req.user,
  });
});

router.get(
  "/search",
  movieController.search,
  authController.protect,
  async (req, res) => {
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

router.post(
  "/update-profile",
  authController.protect,
  userController.updateUserProfile,
  (req, res) => {
    res.redirect("/profile");
  }
);

module.exports = router;
