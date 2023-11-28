const Movie = require("./../models/movieModel.js");
const catchAsync = require("./../Utils/catchAsync");
const math = require("mathjs");
const natural = require("natural");
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
  movies = await Movie.find({}, "id genres keywords").lean();
}

async function fetchGenres() {
  genres = await (
    await fetch(
      `https://api.themoviedb.org/3/genre/movie/list?language=en`,
      options
    )
  ).json();
  genres = genres.genres.map((genre) => genre.name);
}

function encodeGenres(movieGenres) {
  return genres.map((genre) =>
    movieGenres.some((movieGenre) => movieGenre.name === genre) ? 1 : 0
  );
}

function mapGenres() {
  movies.forEach((movie) => {
    console.log(movie.keywords);
    movie.genres = encodeGenres(movie.genres);
  });
}

fetchMovies().then(() => {
  fetchGenres().then(() => {
    mapGenres();
  });
});

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

function findSimilarMovies(targetMovieID, movies) {
  const targetMovie = movies.find((movie) => (movie.id = targetMovieID));
  console.log(targetMovie);
  if (!targetMovie) return [];
  const similarities = movies.map((movie) => {
    const genreSimilarityScore =
      calculateSimilarityGenre(/* vectors of targetMovie and movie */);
    const keywordSimilarityScore = calculateSimilarityKeyword();
    return {
      title: movie.title,
      score: genreSimilarityScore + keywordSimilarityScore,
    };
  });

  // Sort by similarity score
  similarities.sort((a, b) => b.score - a.score);

  return similarities.splice(0, 10);
}

function calculateSimilarityGenre(vector1, vector2) {
  // Use cosine similarity for vector comparison
  return math.divide(
    math.dot(vector1, vector2),
    math.norm(vector1) * math.norm(vector2)
  );
}

function calculateSimilarityKeyword(targetMovie, movie) {
  return (
    targetMovie.keywords.filter((keyword) =>
      movie.keywords.name.includes(keyword.name)
    ) / math.max(targetMovie.keywords.length, movie.keywords.length)
  );
}

module.exports.random = random;
module.exports.top = top;
module.exports.recent = recent;
