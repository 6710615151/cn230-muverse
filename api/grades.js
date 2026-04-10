const express = require("express");
const router = express.Router();
const getDB = require("./db");

router.post("/", async (req, res) => {
  try {
    const sql = getDB();
    const { enrollment_id, score } = req.body;

    const rows = await sql`
      INSERT INTO grades (enrollment_id, score)
      VALUES (${enrollment_id}, ${score})
      RETURNING *
    `;

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


export default router;