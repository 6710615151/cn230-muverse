const express = require("express");
const app = express();

app.use(express.json());

// import routes
app.use("/api/students", require("./students"));
app.use("/api/courses", require("./courses"));
app.use("/api/enrollments", require("./enrollments"));
app.use("/api/grades", require("./grades"));
app.use("/api/report", require("./report"));
app.use("/api/schema", require("./schema"));

module.exports = app;