const multer = require("multer");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("./../models/userModel.js");
const Movie = require("./../models/movieModel.js");
const authController = require("./../controllers/authController");
const path = require("path");
const { google } = require("googleapis");
const passport = require("passport");

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const storage = multer.diskStorage({
  destination: "public/img/profiles",
  filename: function (req, file, cb) {
    const username = req.body.username;
    const fileExtension = path.extname(file.originalname);
    cb(null, `${username}${fileExtension}`);
  },
});
const upload = multer({ storage: storage });

router.get("/privacy", (req, res) => {
  res.render("privacyPolicy");
});
router.get("/", async (req, res) => {
  let top5Movies = await Movie.find(
    {},
    { id: 1, _id: 0, poster_path: 1, original_title: 1 }
  )
    .sort({ popularity: -1 })
    .limit(5)
    .exec();
  // Route handler logic for the GET request
  res.render("dashboard", { top5Movies });
});

router.get("/login", (req, res) => {
  // Check if movies is defined and connected
  Movie.aggregate([
    { $sample: { size: 5 } },
    { $project: { id: 1, _id: 0, poster_path: 1 } },
  ])
    .exec()
    .then((posters) => {
      res.render("login", { posters, googleClientId: process.env.CLIENT_ID });
    })
    .catch((err) => {
      console.error("Error fetching posters:", err);
      res.send(err);
    });
});
router.get("/forgot-password", (req, res) => {
  res.render("forgotPassword");
});
router.post("/signup", upload.single("profile"), authController.signup);
router.post("/login", authController.login);
router.get("/dashboard/:user?", authController.protect, async (req, res) => {
  let top5Movies = await Movie.find(
    {},
    { id: 1, _id: 0, poster_path: 1, original_title: 1 }
  )
    .sort({ popularity: -1 })
    .limit(5)
    .exec();

  if (req.params.user) {
    if (req.user) res.render("dashboard", { top5Movies, user: req.user });
  } else {
    res.render("dashboard", { top5Movies });
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
  res.user = req.data.user;
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
    console.error("Error handling OAuth callback", error);
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

router.post("/facebook/delete-user", (req, res) => {
  const signedRequest = req.body.signed_request;
  const [encodedSig, payload] = signedRequest.split(".");

  // Your App Secret
  const appSecret = process.env.FACEBOOK_APPSECRET;

  // Decode and verify the signature
  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  if (encodedSig !== expectedSig) {
    return res.status(403).send("Invalid request signature");
  }

  // Decode the payload
  const decodedPayload = JSON.parse(Buffer.from(payload, "base64").toString());
  const userId = decodedPayload.user_id;

  User.deleteOne(userId);

  res.send({
    url: "URL_TO_YOUR_CONFIRMATION_PAGE",
    confirmation_code: "CONFIRMATION_CODE",
  });
});
router.post("/facebook/delete-user-guide", (req, res) => {
  res.render("delete-user-guide");
});

router.get("/auth/facebook", passport.authenticate("facebook"), (req, res) => {
  console.log("reached auth/facebook");
});

router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    console.log(res);
    // Successful authentication, redirect home.
    res.redirect(`/dashboard/${res.profile.name}`);
  }
);

router.post(
  "/forgot-password",
  authController.forgotPassword,
  (req, res) => {}
);
router.get("/forgot-password/:token", authController.validateEmailToken);

router.post("/resetPassword", authController.resetPassword);

module.exports = router;
