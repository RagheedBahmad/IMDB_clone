const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  adult: {
    type: Boolean,
    required: true,
    default: false,
  },
  backdrop_path: {
    type: String,
    trim: true,
  },
  genre_ids: [
    {
      type: Number,
    },
  ],
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  original_language: {
    type: String,
    required: true,
    trim: true,
  },
  original_title: {
    type: String,
    required: true,
    trim: true,
  },
  overview: {
    type: String,
    trim: true,
  },
  popularity: {
    type: Number,
  },
  poster_path: {
    type: String,
    trim: true,
  },
  release_date: {
    type: Date,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  video: {
    type: Boolean,
    default: false,
  },
  vote_average: {
    type: Number,
  },
  vote_count: {
    type: Number,
  },
});

const Movie = mongoose.model("Movie", movieSchema, "Movies");

module.exports = Movie;
