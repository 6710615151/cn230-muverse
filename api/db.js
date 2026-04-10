const { neon } = require("@neondatabase/serverless");

function getDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
  }

  // สร้าง connection
  const sql = neon(process.env.DATABASE_URL);

  return sql;
}

module.exports = getDB;