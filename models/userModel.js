const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please tell us your name."],
  },
  email: {
    type: String,
    required: [true, "Please provide your email."],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email address."],
  },
gender: { type: String, required: false },
dateOfBirth: { type: Date, required: false },
country: { type: String, required: false },

  profile: String,
  password: {
    type: String,
    required: [
      function () {
        return this.provider === "email";
      },
      "please enter your password",
    ],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [
      function () {
        return this.provider === "email";
      },
      "please confirm your password",
    ],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same.",
    },
  },
  passwordChangedAt: Date,
  passwordResetExpires: Date,
  passwordResetToken: String,
  provider: {
    type: String,
    required: true,
    enum: ["email", "google", "facebook"],
  },
  providerID: {
    type: String,
    required: [
      function () {
        return this.provider !== "email";
      },
    ],
  },
  dateWhenJoined: { type: Date, required: true },
  reviews: [
    {
      movieId: { type: Number, required: true },
      title: { type: String, required: true},
      review: { type: String, required: true },
      rating: { type: Number, required: true, max: 5 },
    },
  ],
  watchlist: [
    {
      //id poster_path tagline original_title
      id: Number,
      poster_path: String,
      tagline: String,
      original_title: String,
    },
  ],
});

userSchema.pre("save", async function (next) {
  if (this.password) {
    //This middleware only runs if password is modified
    if (!this.isModified("password")) return next();

    //Hash the password with cost 12
    this.password = await bcrypt.hash(this.password, 12);

    //Delete password confirmation
    this.passwordConfirm = undefined;
  }
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// userSchema.pre(/^find/, function (next) {
//   this.find({ active: { $ne: false } });
//   next();
// });

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000);
    return JWTTimeStamp < changedTimeStamp;
  }

  return false;
};

const User = mongoose.model("User", userSchema, "Users");

module.exports = User;