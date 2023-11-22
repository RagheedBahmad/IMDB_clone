const Movie = require("./../models/movieModel.js");
const catchAsync = require("./../Utils/catchAsync");

async function top5() {
  return await Movie.find(
    {},
    { id: 1, _id: 0, poster_path: 1, original_title: 1, overview: 1 }
  )
    .sort({ popularity: -1 })
    .limit(5)
    .exec();
}

async function random(x) {
  return await Movie.aggregate([{ $sample: { size: x } }]).exec();
}

async function recent(x) {
  return await Movie.aggregate([
    { $sort: { release_date: -1 } },
    { $limit: x },
  ]).exec();
}

module.exports.random = random;
module.exports.top5 = top5;
module.exports.recent = recent;
