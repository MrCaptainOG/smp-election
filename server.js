import express from "express";
import bodyParser from "body-parser";
import pool from "./db.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;
const SECRET = process.env.SECRET_CODE || "changeme";

app.use(bodyParser.json());
app.use(express.static("public"));

// restrictions: which real-name cannot vote for which candidate
const restrictions = {
  "Gaurav Kumar": "MrCaptain7777",
  "Shaksham Yadav": ".Yakshbhaiya7690",
  "Archit Bidasarya": "archit_pro2013"
};

// Initialize DB tables if they don't exist (voters, candidates, settings)
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voters (
        id SERIAL PRIMARY KEY,
        real_name TEXT UNIQUE NOT NULL,
        voted BOOLEAN DEFAULT FALSE,
        voted_for TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
    `);

    await pool.query(\`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    \`);

    // insert voters if table empty
    const v = await pool.query("SELECT COUNT(*) FROM voters");
    if (parseInt(v.rows[0].count, 10) === 0) {
      await pool.query(\`
        INSERT INTO voters (real_name) VALUES
        ('Gaurav Kumar'),
        ('Shaksham Yadav'),
        ('Archit Bidasarya'),
        ('Ayush Kumar'),
        ('Archit Ki Behen'),
        ('Ayush Ki Behen')
      \`);
    }

    // insert candidates if empty
    const c = await pool.query("SELECT COUNT(*) FROM candidates");
    if (parseInt(c.rows[0].count, 10) === 0) {
      await pool.query(\`
        INSERT INTO candidates (name) VALUES
        ('MrCaptain7777'),
        ('.Yakshbhaiya7690'),
        ('archit_pro2013')
      \`);
    }

    // settings: results_unlocked default false
    const s = await pool.query("SELECT value FROM settings WHERE key='results_unlocked'");
    if (s.rows.length === 0) {
      await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ['results_unlocked', 'false']);
    }
    console.log("DB initialized");
  } catch (err) {
    console.error("DB init error:", err);
  }
})();

// ---- Vote endpoint: single-page flow expects { real_name, candidate } ----
app.post("/vote", async (req, res) => {
  try {
    const { real_name, candidate } = req.body;
    if (!real_name || !candidate) return res.json({ success: false, message: "Missing data" });

    // check restriction
    if (restrictions[real_name] && restrictions[real_name] === candidate) {
      return res.json({ success: false, message: "You cannot vote for yourself!" });
    }

    const r = await pool.query("SELECT * FROM voters WHERE real_name=$1", [real_name]);
    if (r.rows.length === 0) return res.json({ success: false, message: "Not authorized" });
    if (r.rows[0].voted) return res.json({ success: false, message: "Already voted" });

    // ensure candidate exists
    const cand = await pool.query("SELECT * FROM candidates WHERE name=$1", [candidate]);
    if (cand.rows.length === 0) return res.json({ success: false, message: "Candidate not found" });

    await pool.query("UPDATE voters SET voted = true, voted_for = $1 WHERE real_name = $2", [candidate, real_name]);
    return res.json({ success: true, message: "Vote submitted! Thank you." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---- Results aggregated endpoint ----
app.get("/results", async (req, res) => {
  try {
    const candRes = await pool.query("SELECT name FROM candidates ORDER BY id");
    const candidates = candRes.rows.map(r => r.name);

    const counts = {};
    for (const c of candidates) {
      const r = await pool.query("SELECT COUNT(*) FROM voters WHERE voted_for=$1", [c]);
      counts[c] = parseInt(r.rows[0].count, 10);
    }
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Unlocking endpoints ----
app.get("/is-unlocked", async (req, res) => {
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key='results_unlocked'");
    const unlocked = r.rows.length && r.rows[0].value === "true";
    res.json({ unlocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ unlocked: false });
  }
});

app.post("/unlock", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "Code required" });
    if (code === SECRET) {
      await pool.query("UPDATE settings SET value='true' WHERE key='results_unlocked'");
      return res.json({ success: true, message: "Results unlocked for everyone." });
    } else {
      return res.json({ success: false, message: "Wrong code" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// lock endpoint (admin) requires secret code too
app.post("/lock", async (req, res) => {
  try {
    const { code } = req.body;
    if (code !== SECRET) return res.status(403).json({ success: false, message: "Forbidden" });
    await pool.query("UPDATE settings SET value='false' WHERE key='results_unlocked'");
    return res.json({ success: true, message: "Results locked." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
