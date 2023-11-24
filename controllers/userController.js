const User = require("./../models/userModel");
const catchAsync = require("./../Utils/catchAsync");

exports.addWatchlist = catchAsync(async (req, res) => {
  await User.updateOne(
    { email: req.body.user.email },
    { $addToSet: { watchlist: req.body.movieID } }
  );
});
