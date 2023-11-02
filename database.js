const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

let db;

const connectToDB = async () => {
  const client = new MongoClient(DB);
  await client.connect();
  console.log("Connected to MongoDB");

  db = client.db("IMDB-clone"); // replace 'YOUR_DB_NAME' with the name of your database

  return db;
};

const getDB = () => {
  if (!db) {
    throw new Error(
      "Database not initialized. Did you forget to connect first?"
    );
  }
  return db;
};

module.exports = {
  connectToDB,
  getDB,
};
