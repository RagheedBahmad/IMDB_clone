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

  for (let i = 1; i <= pages; i++) {
    const moviesForPage = await fetchData(i);
    allMovies = allMovies.concat(moviesForPage);
  }
  let i = 1;
  console.log(allMovies.length);
  for (const movie of allMovies) {
    await insertMovie(movie);
    console.log(i + ": Inserted " + movie.original_title);
    i++;
  }
  console.log("Finished inserting movies");
}

const insertMovie = async function (movie) {
  let Casts = [];
  let Crews = [];
  let response = await fetch(
    `https://api.themoviedb.org/3/movie/${movie.id}?append_to_response=credits%2Cvideos%2Creviews%2Cimages&language=en-US&include_image_language=en,null`,
    options
  );
  let updatedMovie = await response.json();
  for (let castMember of updatedMovie.credits.cast) {
    let character = castMember.character;
    delete castMember.character;
    castMember.gender = castMember.gender == 2 ? "Male" : "Female";
    await actors.updateOne(
      { id: castMember.id },
      {
        $set: castMember,
        $unset: { character: "" },
      },
      { upsert: true }
    );
    Casts.push({ id: castMember.id, character: character });
  }
  for (let castMember of updatedMovie.credits.crew) {
    await crew.updateOne(
      { id: castMember.id },
      { $set: castMember },
      { upsert: true }
    );
    Crews.push(castMember.id);
  }
  updatedMovie.credits.cast = Casts;
  updatedMovie.credits.crew = Crews;
  let posterPath = updatedMovie.poster_path;
  const baseImageUrl = "https://image.tmdb.org/t/p/w500";
  if (posterPath) {
    updatedMovie.poster_path = baseImageUrl + posterPath;
  }

  const prependBaseUrl = (imageArray) => {
    return imageArray
      ? imageArray.map((item) => ({
          ...item,
          file_path: baseImageUrl + item.file_path,
        }))
      : [];
  };

  updatedMovie.images.backdrops = prependBaseUrl(updatedMovie.images.backdrops);
  updatedMovie.images.logos = prependBaseUrl(updatedMovie.images.logos);
  updatedMovie.images.posters = prependBaseUrl(updatedMovie.images.posters);

  await movies.updateOne(
    { id: updatedMovie.id },
    { $set: updatedMovie },
    { upsert: true }
  );
};

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

const updatePop = async () => {
  const movies = database.collection("Movies");
  if (!fetch) {
    const module = await import("node-fetch");
    fetch = module.default;
  }
  let pages = (await movies.countDocuments()) / 20;
  for (let i = 1; i < pages; i++) {
    let result = await fetch(
      `https://api.themoviedb.org/3/movie/popular?language=en-US&page=${i}`,
      options
    );
    result = await result.json();
    console.log(result);
    await update(result.results);
  }
};

async function update(movies) {
  for (const movie of movies) {
    let movieDB = await movies.findOne({ id: movie.id });
    if (movie.popularity !== movieDB.popularity) {
      movieDB.popularity = movie.popularity;
    }
  }
}

switch (process.argv[2]) {
  case "--import":
    importData(process.argv[3] ? process.argv[3] : 1);
    break;

  case "--delete":
    deleteData(movies);
    break;

  case "--updatePop":
    updatePop();
    break;

  default:
    console.log("Invalid command");
    break;
}
