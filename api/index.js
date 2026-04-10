const express = require("express");
const serverless = require("serverless-http");

const app = express();
app.use(express.json());

// routes
app.use("/auth", require("./auth"));

app.get("/health", (req, res) => {
  res.json({ success: true });
});

app.get("/test-db", async (req, res) => {
  try {
    const getDB = require("./db");
    const sql = getDB();

    const result = await sql`SELECT NOW()`;

    res.json({
      success: true,
      time: result[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ ต้องอยู่ล่างสุด
module.exports = serverless(app);