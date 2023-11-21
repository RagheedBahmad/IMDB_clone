const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config({
  path: "./config.env",
});

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);
let fs = require("fs");
const path = require("path");

const client = new MongoClient(DB);
client.connect();
const database = client.db("IMDB-clone");
const movies = database.collection("Movies");
const actors = database.collection("Actors");
const genres = database.collection("Genres");
const crew = database.collection("Crew");
const test = database.collection("test");
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
  // let allMovies = [];
  let movieList = await movies.find({}).toArray();
  // for (let i = 1; i <= pages; i++) {
  //   const moviesForPage = await fetchData(i);
  //   allMovies = allMovies.concat(moviesForPage);
  // }
  let i = 1;
  console.log(movieList.length);
  for (const movie of movieList) {
    await insertMovie(movie);
    console.log(i + ": Inserted " + movie.original_title);
    i++;
  }
  console.log("Finished inserting movies");
  process.exit();
}

const insertMovie = async function (movie) {
  const baseImageUrl = "https://image.tmdb.org/t/p/w500";
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
    castMember.profile_path = baseImageUrl + castMember.profile_path;

    await actors.updateOne(
      { id: castMember.id },
      {
        $set: castMember,
        $unset: { character: "" },
        $addToSet: {
          actedIn: updatedMovie.id,
        },
      },
      { upsert: true }
    );
    Casts.push({ id: castMember.id, character: character });
  }
  for (let castMember of updatedMovie.credits.crew) {
    castMember.profile_path = baseImageUrl + castMember.profile_path;
    await crew.updateOne(
      { id: castMember.id },
      {
        $set: castMember,
        $addToSet: {
          workedOn: updatedMovie.id, // Replace with your field name and the value to add
        },
      },
      { upsert: true }
    );
    Crews.push(castMember.id);
  }
  updatedMovie.credits.cast = Casts;
  updatedMovie.credits.crew = Crews;
  let posterPath = updatedMovie.poster_path;

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
  if (!fetch) {
    const module = await import("node-fetch");
    fetch = module.default;
  }
  let movieList = await movies.find({}).toArray();
  const count = movieList.length;
  let i = 1;
  for (const movie of movieList) {
    let result = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`,
      options
    );
    result = await result.json();

    if (movie.popularity !== result.popularity) {
      await movies.updateOne(
        { id: movie.id },
        { $set: { popularity: result.popularity } }
      );
      console.log(
        `${i}/${count}: Updated ${movie.original_title}'s popularity from ${movie.popularity} to ${result.popularity}`
      );
    } else {
      console.log(
        `${i}/${count}: ${movie.original_title}'s popularity didn't change`
      );
    }
    i++;
  }
  // let pages = Math.ceil((await movies.countDocuments()) / 20);
  // for (let i = 1; i <= pages; i++) {
  //   let result = await fetch(
  //     `https://api.themoviedb.org/3/movie/popular?language=en-US&page=${i}`,
  //     options
  //   );
  //   result = await result.json();
  //   await update(result.results);
  //   console.log("updated page " + i);
  // }
  process.exit(1);
};

// async function update(movieList) {
//   for (const movie of movieList) {
//     let movieDB = await movies.findOne({ id: movie.id });
//     if (movieDB && movie.popularity !== movieDB.popularity) {
//       let oldPop = movieDB.popularity;
//       await movies.updateOne(
//         { id: movieDB.id },
//         { $set: { popularity: movie.popularity } }
//       );
//       console.log(
//         `Updated ${movieDB.original_title}'s popularity from ${oldPop} to ${movie.popularity}`
//       );
//     } else if (!movieDB) {
//       await movies.insertOne(movie);
//       console.log("inserted new movie: " + movie.original_title);
//     }
//   }
// }

const updatePost = async () => {
  if (!fetch) {
    const module = await import("node-fetch");
    fetch = module.default;
  }
  let movieList = await movies.find({}).toArray();
  for (const movie of movieList) {
    if (!movie.poster_path.startsWith("https://image.tmdb.org/t/p/w500")) {
      await movies.updateOne(
        { id: movie.id },
        {
          $set: {
            poster_path: "https://image.tmdb.org/t/p/w500" + movie.poster_path,
          },
        }
      );
      console.log(movie.poster_path);
    }
  }
  console.log("finished");
};

async function resetCredit() {
  let actorList = await actors.find({}).toArray();
  let crewList = await crew.find({}).toArray();
  console.log("finished fetching data");
  for (let actor of actorList) {
    await actors.updateOne({ id: actor.id }, { $unset: { actedIn: "" } });
    console.log("deleted " + actor.id);
  }
  console.log("finished actors");
  for (let crews of crewList) {
    await crew.updateOne({ id: crews.id }, { $unset: { workedOn: "" } });
    console.log("deleted " + crews.id);
  }
  console.log("finished resetting");
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

  case "--updatePost":
    updatePost();
    break;

  case "--resetCredit":
    resetCredit();
    break;

  default:
    console.log("Invalid command");
    break;
}
