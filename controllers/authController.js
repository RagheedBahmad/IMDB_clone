const crypto = require("crypto");
const { promisify } = require("util");
const User = require("./../models/userModel");
const catchAsync = require("./../Utils/catchAsync");
const jwt = require("jsonwebtoken");
const AppError = require("./../Utils/appError");
// const sendEmail = require('./../Utils/email');
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
const sendEmail = require("../Utils/email");
const client = new OAuth2Client(process.env.CLIENT_ID + "");
const fs = require("fs");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  console.log("signing up");
  let profilePath;
  if (req.file) profilePath = "/img/profiles/" + req.file.filename;
  let user = await User.findOne({ email: req.body.email });
  console.log(user);
  if (!user) {
    let timestamp = Date.now();
    let date = new Date(timestamp);
    const newUser = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      profile: req.file ? profilePath : "null",
      provider: "email",
      providerId: null,
      dateWhenJoined: date,
    });

    createSendToken(newUser, 201, res);
  } else {
    if (req.file)
      fs.unlink("./public/img/profiles/" + req.file.filename, (err) => {
        if (err) console.log(err);
      });
    return next(new AppError("User with this email already exists", 409));
  }
});

exports.login = catchAsync(async (req, res, next) => {
  console.log("logging in");
  try {
    let user;
    console.log(req.body);
    const { email, password } = req.body;

    // 1) Email and Password actually exist
    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    // 2) Check if user exists & password is correct
    user = await User.findOne({ email }).select("+password");
    let provider = user.provider;
    if (provider === "google") {
      return next(
        new AppError(
          "This account is signed up using google, please link your account or continue with google.",
          501
        )
      );
    }
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError("Incorrect email or password.", 401));
    }

    // 3) If everything is ok, send token to client
    createSendToken(user, 200, res);
  } catch (error) {
    if (error instanceof AppError) {
      // Respond with the error details if it is an AppError
      res
        .status(error.statusCode)
        .send({ status: error.status, message: error.message });
    } else {
      // If it's not an operational error, consider it a 500 server error
      res
        .status(500)
        .send({ status: "error", message: "Something went wrong!" });
    }
  }
});

exports.protect = catchAsync(async (req, res, next) => {
  let username = req.params.user;

  // 1) Getting Token and check if it exists
  let token;
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not Logged In, Please Login to gain access", 401)
    );
  }
  // 2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to the token no longer exists", 401)
    );
  }

  if (currentUser.username !== username) {
    return next(
      new AppError("You do not have permission to access this page"),
      401
    );
  }

  // 4) Check if user changed password after the JWT was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password, please login again.", 401)
    );
  }
  // Grant access to protected route
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 401)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get User based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }
  // 2) Generate random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // 3) Send it to the user's email
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/forgot-password/${resetToken}`;

  const message = `Forgot your password? click this link to reset your password : ${resetURL}\nIf you didn't forget your password, please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 minutes)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email.\n(check spam or junk folders)",
      user: user.username,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "there was an error sending the email. Try again later.",
        500
      )
    );
  }
});

exports.validateEmailToken = catchAsync(async (req, res, next) => {
  console.log("entered validateEmailToken");
  // 1) get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) Set new password if user and token hasn't expired
  if (!user) {
    return next(new AppError("Token invalid or expired", 400));
  } else {
    console.log(user);
    res.render("passwordReset", { user });
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  console.log("entered resetpassword");
  console.log(req.body);
  let user = await User.findOne({ _id: req.body.userID }).select("+password");
  console.log(user);
  if (req.body.password !== req.body.passwordConfirm) {
    console.log("error");
    return next(new AppError("Passwords do not match", 501));
  }
  ////////////////////////////////////////////////////////////////////////
  // I ADDED THIS FEATURE SO IT MIGHT BE BUGGY WHICH I THINK IT IS
  // if (await user.correctPassword(req.body.password, user.password)) {
  //   return next(new AppError("New password cannot be old password"), 401);
  // }
  ////////////////////////////////////////////////////////////////////////
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3) Update changePasswordAt property

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from database
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("current password is incorrect.", 400));
  }
  // 3) If so update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

exports.googleAuth = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
  });
  const payload = ticket.getPayload();
  // Find or create user in the database
  let user = await User.findOne({ providerID: payload.sub });
  if (!user) {
    console.log("didnt find user");
    console.log(payload.sub);
    // Create a new user record
    user = await User.create({
      username: payload.name,
      email: payload.email,
      profile: payload.picture,
      provider: "google",
      providerID: payload.sub,
      // other user fields...
    });
  }

  createSendToken(user, 200, res);
});

exports.linkGoogleAccount = catchAsync(async (req, res, next) => {});

exports.deleteFacebookUser = catchAsync(async (userId) => {
  User.deleteOne({ userId });
});
