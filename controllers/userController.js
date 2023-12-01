const User = require("./../models/userModel");
const catchAsync = require("./../Utils/catchAsync");
const Movie = require("./../models/movieModel.js");

exports.addWatchlist = catchAsync(async (req, res, next) => {
  console.log(req.body.movieID);
  let movie = await Movie.find(
    { id: req.body.movieID },
    "id poster_path tagline original_title"
  ).exec();
  console.log(movie);
  await User.updateOne(
    { email: req.body.user.email },
    { $addToSet: { watchlist: movie } }
  );
  res.status(200).json({ message: "Success", movie });
});

exports.removeWatchlist = catchAsync(async (req, res, next) => {
  await User.updateOne(
    { email: req.body.user.email },
    { $pull: { watchlist: { id: req.body.movieID } } }
  );
  res.status(200).json({ message: "Success", movieID: req.body.movieID });
});
