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
const collection = database.collection("Movies");
collection.createIndex({ id: 1 }, { unique: true });
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
    for (let movie of movieData.results) {
      const posterPath = movie.poster_path;
      if (posterPath) {
        const baseImageUrl = "https://image.tmdb.org/t/p/w500";
        movie.poster_path = baseImageUrl + posterPath;
      }
    }
    return movieData.results; // return this directly
  } catch (err) {
    console.error("Error fetching data:", err);
    return []; // Return an empty array on error
  }
}

async function importData(pages) {
  let allMovies = [];

  for (let i = 1; i <= pages; i++) {
    const moviesForPage = await fetchData(i);
    allMovies = allMovies.concat(moviesForPage);
  }

  try {
    const result = await collection.insertMany(allMovies, { ordered: false });
    console.log(`Inserted ${result.insertedCount} items`);
  } catch (err) {
    console.error("Error inserting data:", err);
  }
}

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await collection.deleteMany().then((err) => {
      if (err) {
        console.error("Error deleting from database:", err);
      }

      fs.readdir("./../posters/", (err, files) => {
        if (err) {
          console.error("Error reading directory:", err);
        }

        files.forEach((file) => {
          const filePath = path.join("./../posters/", file);
          fs.unlinkSync(filePath);
        });

        console.log("Data successfully deleted");
      });
    });
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === "--import") {
  importData(process.argv[3] ? process.argv[3] : 1);
} else if (process.argv[2] === "--delete") {
  deleteData();
}
