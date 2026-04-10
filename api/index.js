const express = require("express");
const app = express();

app.use(express.json());

// import route
app.use("/auth", require("./auth"));

// health check
app.get("/health", (req, res) => {
  res.json({ success: true, status: "ok" });
});

module.exports = app;