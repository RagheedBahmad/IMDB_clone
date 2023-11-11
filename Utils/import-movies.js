const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config({
  path: "./config.env",
});

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);
const fs = require("fs");
const path = require("path");

const client = new MongoClient(DB);
client.connect();
const database = client.db("IMDB-clone");
const movies = database.collection("Movies");
const actors = database.collection("Actors");
const genres = database.collection("Genres");
const crew = database.collection("Crew");
movies.createIndex({ id: 1 }, { unique: true });
// IMPORT DATA INTO DB

const options = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization:
      "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjMzlmYzZjNjAxNzQxYzhlYTg3YzdmZWNjYzU2NjJkMSIsInN1YiI6IjY1MzYyZGI3YzhhNWFjMDBjNTBhYzI4ZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Hct3NjJjfIMH5uKpjEFBe7Hcbas44bVnA5qYHxuJ338",
  },
};
let fetch;

async function fetchData(page) {
  if (!fetch) {
    const module = await import("node-fetch");
    fetch = module.default;
  }
  const url = `https://api.themoviedb.org/3/discover/movie?include_adult=true&include_video=false&language=en-US&page=${page}&sort_by=popularity.desc`;

  try {
    const response = await fetch(url, options);
    const movieData = await response.json();

    return movieData.results; // return this directly
  } catch (err) {
    console.error("Error fetching data:", err);
    return []; // Return an empty array on error
  }
}

async function importData(pages) {
  if (!fetch) {
    const module = await import("node-fetch");
    fetch = module.default;
  }
  let allMovies = [];
  let Casts = [];
  let Crews = [];

  for (let i = 1; i <= pages; i++) {
    const moviesForPage = await fetchData(i);
    allMovies = allMovies.concat(moviesForPage);
  }
  for (const movie of allMovies) {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}?append_to_response=credits%2Cvideos%2Creviews%2Cimages&language=en-US&include_image_language=en,null`,
      options
    );
    let updatedMovie = await response.json();
    for (const castMember of updatedMovie.credits.cast) {
      castMember.gender = castMember.gender == 2 ? "Male" : "Female";
      await actors.updateOne(
        { id: castMember.id },
        { $set: castMember },
        { upsert: true }
      );
      Casts.push(castMember.id);
    }
    for (const castMember of updatedMovie.credits.crew) {
      await crew.updateOne(
        { id: castMember.id },
        { $set: castMember },
        { upsert: true }
      );
      Crews.push(castMember.id);
    }
    updatedMovie.credits.cast = Casts;
    updatedMovie.credits.crew = Crews;
    const posterPath = updatedMovie.poster_path;
    if (posterPath) {
      const baseImageUrl = "https://image.tmdb.org/t/p/w500";
      movie.poster_path = baseImageUrl + posterPath;
    }

    await movies
      .updateOne(
        { id: updatedMovie.id },
        { $set: updatedMovie },
        { upsert: true }
      )
      .then(() => {
        console.log("Inserted " + updatedMovie.original_title);
      });
  }
}

// DELETE ALL DATA FROM DB
const deleteData = async (collection) => {
  try {
    await collection.deleteMany().then((err) => {
      if (err) {
        console.error("Error deleting from database:", err);
      }
      console.log("Data successfully deleted");
    });
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

async function fetchGenres() {
  if (!fetch) {
    const module = await import("node-fetch");
    fetch = module.default;
  }

  const url = "https://api.themoviedb.org/3/genre/movie/list?language=en";

  fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      console.log(json);
      let result = json.genres;
      const upsertOperations = result.map((obj) => ({
        updateOne: {
          filter: { id: obj.id }, // Or use another unique identifier
          update: { $set: obj },
          upsert: true,
        },
      }));

      genres
        .bulkWrite(upsertOperations)
        .then((result) => console.log("Bulk upsert result:", result))
        .catch((err) => console.error("Bulk upsert error:", err));
    })
    .catch((err) => console.error("error:" + err));
}

if (process.argv[2] === "--import") {
  importData(process.argv[3] ? process.argv[3] : 1);
} else if (process.argv[2] === "--delete") {
  deleteData(movies);
} else if (process.argv[2] === "--genres") {
  fetchGenres();
} else if (process.argv[2] === "--genresDelete") {
  deleteData(genres);
} else if (process.argv[2] === "--actors") {
  fetchActors();
} else if (process.argv[2] === "--actorsDelete") {
  deleteData(actors);
}
