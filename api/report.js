const express = require("express");
const router = express.Router();
const getDB = require("./db");

router.get("/summary", async (req, res) => {
  try {
    const sql = getDB();
    const rows = await sql`SELECT COUNT(*) FROM students`;
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;