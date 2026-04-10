const express = require("express");
const router = express.Router();
const getDB = require("./db");

router.get("/", async (req, res) => {
  try {
    const sql = getDB();
    const rows = await sql`
      SELECT * FROM enrollments
    `;
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;