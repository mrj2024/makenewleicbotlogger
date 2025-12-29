const { getDb } = require("./index");

async function ensureIndexes() {
  const db = getDb();
  const col = db.collection("modlogs");

  await col.createIndex({ caseId: 1 }, { unique: true });
  await col.createIndex({ "target.key": 1, createdAt: -1 });
  await col.createIndex({ status: 1, createdAt: -1 });

  console.log("✅ MongoDB indexes ensured");
}

module.exports = { ensureIndexes };
