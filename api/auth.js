const express = require("express");
const router = express.Router();
const getDB = require("./db");

// ✅ SIGN UP
router.post("/signup", async (req, res) => {
  try {
    const sql = getDB();
    const { username, password } = req.body;

    // เช็ค user ซ้ำ
    const existing = await sql`
      SELECT * FROM users WHERE username = ${username}
    `;

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "user already exists"
      });
    }

    // insert
    await sql`
      INSERT INTO users (username, password)
      VALUES (${username}, ${password})
    `;

    res.json({ success: true, message: "signup success" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ✅ LOGIN
router.post("/login", async (req, res) => {
  try {
    const sql = getDB();
    const { username, password } = req.body;

    const result = await sql`
      SELECT * FROM users
      WHERE username = ${username}
      AND password = ${password}
    `;

    if (result.length === 0) {
      return res.status(401).json({
        success: false,
        message: "invalid credentials"
      });
    }

    res.json({
      success: true,
      user: result[0]
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;