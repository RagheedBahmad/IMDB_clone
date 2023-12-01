const User = require("./../models/userModel");
const catchAsync = require("./../Utils/catchAsync");

exports.addWatchlist = catchAsync(async (req, res, next) => {
  await User.updateOne(
    { email: req.body.user.email },
    { $addToSet: { watchlist: req.body.movieID } }
  );
  res.status(200).json({ message: "Success" });
});

exports.removeWatchlist = catchAsync(async (req, res, next) => {
  await User.updateOne(
    { email: req.body.user.email },
    { $pull: { watchlist: req.body.movieID } }
  );
  res.status(200).json({ message: "Success" });
});
