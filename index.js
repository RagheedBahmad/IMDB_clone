const express = require("express");
const app = express();
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { MongoClient } = require("mongodb").MongoClient;
const { connectToDB } = require("./database.js");

const PORT = 3000;

const path = require("path");
// const multer = require("multer");

connectToDB()
  .then(() => {
    // Require the routes file
    const routes = require("./routes/routes");

    app.set("views", path.join(__dirname, "views"));
    app.set("view engine", "ejs");
    app.use(express.static(path.join(__dirname, "public")));

    // Use the router middleware
    app.use("/", routes);

    const server = app.listen(PORT, () => {
      console.log(`App running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("couldn't connect to Database");
  });
