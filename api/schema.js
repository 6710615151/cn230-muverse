const express = require("express");
const router = express.Router();
const getDB = require("./db");

router.get("/", async (req, res) => {
  try {
    const sql = getDB();
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
    `;
    res.json({ success: true, tables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;