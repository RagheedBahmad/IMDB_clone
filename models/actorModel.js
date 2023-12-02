const mongoose = require("mongoose");

const actorSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  adult: {
    type: Boolean,
    default: false,
  },
  cast_id: {
    type: Number,
  },
  credit_id: {
    type: String, 
  },
  gender: {
    type: String,
  },
  known_for_department: {
    type: String,
  },
  name: {
    type: String,
  },
  order: {
    type: Number,
  },
  original_name: {
    type: String,
  },
  popularity: {
    type: Number,
  },
  profile_path: {
    type: String,
    trim: true,
  },
  actedIn: [
    {
      type: Number,
      required: true,
    },
  ],
  biography: {
    type: String,
    trim: true,
  },
});

const Actor = mongoose.model("Actor", actorSchema, "Actors");

module.exports = Actor;
