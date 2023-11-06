const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { MongoClient } = require("mongodb").MongoClient;
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const AppError = require("./Utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

const corsOptions = {
  origin: "http://localhost:3000", // This should match the URL of your front-end app
  credentials: true, // This allows the server to accept cookies via requests
  optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cookieParser());
app.use(cors(corsOptions));

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

const routes = require("./routes/routes");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Use the router middleware
app.use("/", routes);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
});

app.use(globalErrorHandler);

const PORT = 3000;
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);
// const multer = require("multer");
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to database.");
    const server = app.listen(PORT, () => {
      console.log(`App running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to the database", err);
  });
