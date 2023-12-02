const Movie = require("./../models/movieModel.js");
const catchAsync = require("./../Utils/catchAsync");
const math = require("mathjs");
const options = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization:
      "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjMzlmYzZjNjAxNzQxYzhlYTg3YzdmZWNjYzU2NjJkMSIsInN1YiI6IjY1MzYyZGI3YzhhNWFjMDBjNTBhYzI4ZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Hct3NjJjfIMH5uKpjEFBe7Hcbas44bVnA5qYHxuJ338",
  },
};
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
let genres;
let movies;
async function fetchMovies() {
  movies = await Movie.find(
    {},
    "original_title id genres keywords poster_path tagline"
  ).lean();
  await fetchGenres();
}

async function fetchGenres() {
  genres = await (
    await fetch(
      `https://api.themoviedb.org/3/genre/movie/list?language=en`,
      options
    )
  ).json();
  genres = genres.genres.map((genre) => genre.name);
  mapGenres();
}

function encodeGenres(movieGenres) {
  return genres.map((genre) =>
    movieGenres.some((movieGenre) => movieGenre.name === genre) ? 1 : 0
  );
}

function mapGenres() {
  movies.forEach((movie) => {
    movie.genres = encodeGenres(movie.genres);
  });
}

async function top(x) {
  return await Movie.find(
    {},
    {
      id: 1,
      _id: 0,
      poster_path: 1,
      original_title: 1,
      overview: 1,
      credits: 1,
    }
  )
    .sort({ popularity: -1 })
    .limit(x)
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

function findSimilarMovies(targetMovieName) {
  const targetMovie = movies.find(
    (movie) => movie.original_title === targetMovieName
  );
  if (!targetMovie) return [];
  let $movies = movies.filter(
    (movie) =>
      movie.original_title.toLowerCase() !== targetMovieName.toLowerCase()
  );
  const similarities = $movies.map((movie) => {
    const genreSimilarityScore = calculateSimilarityGenre(
      targetMovie.genres,
      movie.genres
    );
    const keywordSimilarityScore = calculateSimilarityKeyword(
      targetMovie.keywords,
      movie.keywords
    );
    return {
      title: movie.original_title,
      score: genreSimilarityScore + keywordSimilarityScore,
      poster_path: movie.poster_path,
      id: movie.id,
      tagline: movie.tagline,
    };
  });
  similarities.sort((a, b) => b.score - a.score);

  return similarities.splice(1, 5);
}

function calculateSimilarityGenre(vector1, vector2) {
  // Use cosine similarity for vector comparison
  return math.divide(
    math.dot(vector1, vector2),
    math.norm(vector1) * math.norm(vector2)
  );
}

function calculateSimilarityKeyword(targetMovie, movie) {
  if (!Array.isArray(movie)) {
    // Handle the case where movie is not an array
    console.error('Error: movie is not an array');
    return 0; 
  }

  const commonKeywords = targetMovie.filter((keyword) => {
    return movie.some((obj) => obj.name === keyword.name);
  });

  return commonKeywords.length / Math.max(targetMovie.length, movie.length);
}

exports.search = catchAsync(async (req, res, next) => {
  let movie = req.query.q;
  res.movies = await Movie.find({
    original_title: { $regex: movie, $options: "i" },
  }).sort({ popularity: -1 });
  res.similarMovies = findSimilarMovies(movie);
  next();
});

exports.regexSearch = catchAsync(async (req, res, next) => {
  let escapedTerm = req.body.query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  let regex = new RegExp(`^${escapedTerm}`, "i");

  res.movies = await Movie.find(
    { original_title: regex },
    "original_title poster_path id"
  )
    .sort({ popularity: -1 })
    .limit(3)
    .exec();
  next();
});

module.exports.random = random;
module.exports.top = top;
module.exports.recent = recent;
module.exports.similar = findSimilarMovies;
module.exports.encodeGenres = fetchMovies;
