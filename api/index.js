import express from "express";

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok" });
});

// import routes
import student from "./student.js";
import courses from "./courses.js";
import enrollments from "./enrollments.js";
import grades from "./grades.js";
import report from "./report.js";
import schema from "./schema.js";

app.use("/api/students", student);
app.use("/api/courses", courses);
app.use("/api/enrollments", enrollments);
app.use("/api/grades", grades);
app.use("/api/report", report);
app.use("/api/schema", schema);

export default app;