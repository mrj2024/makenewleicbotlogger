const { MongoClient } = require("mongodb");
const config = require("../config");

let client;
let db;

async function connect() {
  if (db) return db;

  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.mongoDbName);

  console.log("✅ MongoDB connected");
  return db;
}

function getDb() {
  if (!db) throw new Error("DB not connected yet");
  return db;
}

module.exports = { connect, getDb };
