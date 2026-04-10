const express = require("express");
const router = express.Router();
const getDB = require("./db");

// GET all
router.get("/", async (req, res) => {
  try {
    const sql = getDB();
    const rows = await sql`SELECT * FROM students ORDER BY student_id`;
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// GET by id
router.get("/:id", async (req, res) => {
  try {
    const sql = getDB();
    const rows = await sql`
      SELECT * FROM students WHERE student_id = ${parseInt(req.params.id)}
    `;
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST
router.post("/", async (req, res) => {
  try {
    const sql = getDB();
    const { student_code, first_name, last_name, email } = req.body;
    const rows = await sql`
      INSERT INTO students (student_code, first_name, last_name, email)
      VALUES (${student_code}, ${first_name}, ${last_name}, ${email})
      RETURNING *
    `;
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;