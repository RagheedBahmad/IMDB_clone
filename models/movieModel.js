const mongoose = require("mongoose");

base_Url = "https://image.tmdb.org/t/p/w500"

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
  credits: {
    cast: [
      {
        id: {
          type: Number,
        },
        character: {
          type: String,
        },
      },
    ],
    crew: [
      {
        type: Number,
      },
    ],
  },
  genres: [
    {
      id:{
        type: Number,
      },
      name: {
        type: String,
      },
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
  reviews: {
    page: {
      type: Number,
    },
    results: [
      {
        author: {
          type: String,
        },
        author_details: {
          name: {
            type: String,
          },
          username: {
            type: String,
          },
          avatar_path: {
            type: String,
            get: v => base_Url+v,
          },
          rating: {
            type: Number,
          },
        },
        content: {
          type: String,
        },
        created_at: {
          type: Date,
        },
        id: {
          type: String,
        },
        updated_at: {
          type: Date,
        },
        url: {
          type: String,
        },
      },
    ],
    // ... other review-related fields ...
  },
});

const Movie = mongoose.model("Movie", movieSchema, "Movies");

module.exports = Movie;
