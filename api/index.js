const express = require("express");
const { neon } = require("@neondatabase/serverless");
const path = require("path");

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));

function getDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(process.env.DATABASE_URL);
}

app.get("/api/init", async (req, res) => {
  try {
    const sql = getDB();
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        student_id   SERIAL PRIMARY KEY,
        student_code VARCHAR(10)  UNIQUE NOT NULL,
        first_name   VARCHAR(100) NOT NULL,
        last_name    VARCHAR(100) NOT NULL,
        email        VARCHAR(150) UNIQUE NOT NULL,
        faculty      VARCHAR(100),
        year_level   INT CHECK (year_level BETWEEN 1 AND 6),
        gpa          DECIMAL(3,2) DEFAULT 0.00,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS courses (
        course_id   SERIAL PRIMARY KEY,
        course_code VARCHAR(10)  UNIQUE NOT NULL,
        course_name VARCHAR(200) NOT NULL,
        credits     INT NOT NULL DEFAULT 3,
        department  VARCHAR(100),
        semester    VARCHAR(20),
        instructor  VARCHAR(100)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS enrollments (
        enrollment_id SERIAL PRIMARY KEY,
        student_id    INT REFERENCES students(student_id) ON DELETE CASCADE,
        course_id     INT REFERENCES courses(course_id)  ON DELETE CASCADE,
        enrolled_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status        VARCHAR(20) DEFAULT 'active',
        UNIQUE(student_id, course_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS grades (
        grade_id      SERIAL PRIMARY KEY,
        enrollment_id INT REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
        score         DECIMAL(5,2) CHECK (score BETWEEN 0 AND 100),
        letter_grade  VARCHAR(2),
        grade_point   DECIMAL(3,2),
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const count = await sql`SELECT COUNT(*) FROM students`;
    if (parseInt(count[0].count) === 0) {
      await sql`
        INSERT INTO students (student_code, first_name, last_name, email, faculty, year_level, gpa) VALUES
          ('6601001', 'สมชาย',  'ใจดี',    'somchai@mu.ac.th',  'ICT',       2, 3.25),
          ('6601002', 'สมหญิง', 'รักเรียน', 'somying@mu.ac.th',  'Science',   1, 3.80),
          ('6601003', 'อนันต์',  'มีสุข',   'anant@mu.ac.th',    'ICT',       3, 2.95),
          ('6601004', 'วิชัย',  'ขยัน',    'wichai@mu.ac.th',   'Medicine',  4, 3.50),
          ('6601005', 'นิดา',   'ฉลาด',    'nida@mu.ac.th',     'ICT',       2, 3.10)
        ON CONFLICT DO NOTHING
      `;

      await sql`
        INSERT INTO courses (course_code, course_name, credits, department, semester, instructor) VALUES
          ('CN230',  'Database Systems',          3, 'CS',   '1/2567', 'Dr.สมศักดิ์'),
          ('CN231',  'Data Structures',           3, 'CS',   '1/2567', 'Dr.วิมล'),
          ('CN320',  'Web Programming',           3, 'CS',   '1/2567', 'Dr.ณัฐพล'),
          ('MA101',  'Calculus I',                3, 'Math', '1/2567', 'Dr.กาญจนา'),
          ('CS101',  'Intro to Programming',      3, 'CS',   '1/2567', 'Dr.ประยุทธ')
        ON CONFLICT DO NOTHING
      `;

      await sql`
        INSERT INTO enrollments (student_id, course_id) VALUES
          (1,1),(1,2),(1,3),
          (2,1),(2,4),(2,5),
          (3,1),(3,3),
          (4,4),(4,5),
          (5,1),(5,2),(5,3)
        ON CONFLICT DO NOTHING
      `;

      await sql`
        INSERT INTO grades (enrollment_id, score, letter_grade, grade_point) VALUES
          (1, 85, 'A',  4.00),
          (2, 72, 'B+', 3.50),
          (3, 68, 'B',  3.00),
          (4, 92, 'A',  4.00),
          (5, 78, 'B+', 3.50),
          (7, 60, 'C+', 2.50),
          (8, 75, 'B+', 3.50)
        ON CONFLICT DO NOTHING
      `;
    }

    res.json({ success: true, message: "Tables created and seeded successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/students", async (req, res) => {
  try {
    const sql = getDB();
    const { search, faculty, year } = req.query;
    let rows;

    if (search || faculty || year) {
      rows = await sql`
        SELECT * FROM students
        WHERE
          (${ search || null } IS NULL OR first_name ILIKE ${'%' + (search||'') + '%'} OR last_name ILIKE ${'%' + (search||'') + '%'} OR student_code ILIKE ${'%' + (search||'') + '%'})
          AND (${ faculty || null } IS NULL OR faculty = ${ faculty })
          AND (${ year ? parseInt(year) : null } IS NULL OR year_level = ${ year ? parseInt(year) : null })
        ORDER BY student_id
      `;
    } else {
      rows = await sql`SELECT * FROM students ORDER BY student_id`;
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/students/:id", async (req, res) => {
  try {
    const sql = getDB();
    const rows = await sql`
      SELECT s.*,
             COUNT(DISTINCT e.course_id)   AS enrolled_courses,
             ROUND(AVG(g.grade_point), 2)  AS avg_grade_point
      FROM students s
      LEFT JOIN enrollments e ON s.student_id = e.student_id
      LEFT JOIN grades      g ON e.enrollment_id = g.grade_id
      WHERE s.student_id = ${parseInt(req.params.id)}
      GROUP BY s.student_id
    `;
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Student not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const sql = getDB();
    const { student_code, first_name, last_name, email, faculty, year_level, gpa } = req.body;
    const rows = await sql`
      INSERT INTO students (student_code, first_name, last_name, email, faculty, year_level, gpa)
      VALUES (${student_code}, ${first_name}, ${last_name}, ${email}, ${faculty}, ${year_level || 1}, ${gpa || 0})
      RETURNING *
    `;
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const sql = getDB();
    const { first_name, last_name, email, faculty, year_level, gpa } = req.body;
    const rows = await sql`
      UPDATE students
      SET first_name = ${first_name}, last_name = ${last_name}, email = ${email},
          faculty = ${faculty}, year_level = ${year_level}, gpa = ${gpa}
      WHERE student_id = ${parseInt(req.params.id)}
      RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Student not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const sql = getDB();
    const rows = await sql`
      DELETE FROM students WHERE student_id = ${parseInt(req.params.id)} RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Student not found" });
    res.json({ success: true, message: "Deleted", data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/courses", async (req, res) => {
  try {
    const sql = getDB();
    const rows = await sql`
      SELECT c.*,
             COUNT(e.student_id) AS enrolled_count
      FROM courses c
      LEFT JOIN enrollments e ON c.course_id = e.course_id
      GROUP BY c.course_id
      ORDER BY c.course_id
    `;
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/courses", async (req, res) => {
  try {
    const sql = getDB();
    const { course_code, course_name, credits, department, semester, instructor } = req.body;
    const rows = await sql`
      INSERT INTO courses (course_code, course_name, credits, department, semester, instructor)
      VALUES (${course_code}, ${course_name}, ${credits || 3}, ${department}, ${semester}, ${instructor})
      RETURNING *
    `;
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  try {
    const sql = getDB();
    const rows = await sql`DELETE FROM courses WHERE course_id = ${parseInt(req.params.id)} RETURNING *`;
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Course not found" });
    res.json({ success: true, message: "Deleted", data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get("/api/enrollments", async (req, res) => {
  try {
    const sql = getDB();
    const rows = await sql`
      SELECT e.enrollment_id, e.enrolled_at, e.status,
             s.student_code, s.first_name, s.last_name,
             c.course_code,  c.course_name, c.credits,
             g.score, g.letter_grade, g.grade_point
      FROM enrollments e
      JOIN students s ON e.student_id  = s.student_id
      JOIN courses  c ON e.course_id   = c.course_id
      LEFT JOIN grades g ON e.enrollment_id = g.enrollment_id
      ORDER BY e.enrollment_id
    `;
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/enrollments", async (req, res) => {
  try {
    const sql = getDB();
    const { student_id, course_id } = req.body;
    const rows = await sql`
      INSERT INTO enrollments (student_id, course_id)
      VALUES (${student_id}, ${course_id})
      RETURNING *
    `;
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/grades", async (req, res) => {
  try {
    const sql = getDB();
    const { enrollment_id, score } = req.body;
    const grade_point =
      score >= 80 ? 4.00 :
      score >= 75 ? 3.50 :
      score >= 70 ? 3.00 :
      score >= 65 ? 2.50 :
      score >= 60 ? 2.00 :
      score >= 55 ? 1.50 :
      score >= 50 ? 1.00 : 0.00;
    const letter_grade =
      score >= 80 ? "A"  :
      score >= 75 ? "B+" :
      score >= 70 ? "B"  :
      score >= 65 ? "C+" :
      score >= 60 ? "C"  :
      score >= 55 ? "D+" :
      score >= 50 ? "D"  : "F";

    const rows = await sql`
      INSERT INTO grades (enrollment_id, score, letter_grade, grade_point)
      VALUES (${enrollment_id}, ${score}, ${letter_grade}, ${grade_point})
      ON CONFLICT (enrollment_id) DO UPDATE
        SET score = ${score}, letter_grade = ${letter_grade}, grade_point = ${grade_point}, updated_at = NOW()
      RETURNING *
    `;
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/sql", async (req, res) => {
  try {
    const sql = getDB();
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: "Query is empty" });
    }

    const upper = query.trim().toUpperCase();
    const blocked = ["DROP TABLE", "DROP DATABASE", "TRUNCATE", "ALTER TABLE"];
    for (const b of blocked) {
      if (upper.includes(b)) {
        return res.status(403).json({ success: false, error: `Statement "${b}" is not allowed in the playground` });
      }
    }

    const start = Date.now();
    const rows = await sql.unsafe(query);
    const duration = Date.now() - start;

    res.json({
      success: true,
      data: rows,
      rowCount: rows.length,
      duration: `${duration}ms`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/api/report/summary", async (req, res) => {
  try {
    const sql = getDB();
    const [students, courses, enrollments, avgGpa] = await Promise.all([
      sql`SELECT COUNT(*) AS count FROM students`,
      sql`SELECT COUNT(*) AS count FROM courses`,
      sql`SELECT COUNT(*) AS count FROM enrollments`,
      sql`SELECT ROUND(AVG(gpa), 2) AS avg FROM students`
    ]);

    const byFaculty = await sql`
      SELECT faculty, COUNT(*) AS count
      FROM students
      GROUP BY faculty
      ORDER BY count DESC
    `;

    const topStudents = await sql`
      SELECT student_code, first_name, last_name, gpa, faculty
      FROM students
      ORDER BY gpa DESC
      LIMIT 5
    `;

    res.json({
      success: true,
      data: {
        total_students:    parseInt(students[0].count),
        total_courses:     parseInt(courses[0].count),
        total_enrollments: parseInt(enrollments[0].count),
        avg_gpa:           parseFloat(avgGpa[0].avg),
        by_faculty:        byFaculty,
        top_students:      topStudents
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get("/api/schema", async (req, res) => {
  try {
    const sql = getDB();
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const schema = {};
    for (const { table_name } of tables) {
      const cols = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = ${table_name}
        ORDER BY ordinal_position
      `;
      schema[table_name] = cols;
    }
    res.json({ success: true, tables: tables.map(t => t.table_name), schema });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", project: "cn230-muverse", time: new Date().toISOString() });
});


app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`cn230-muverse running on port ${PORT}`));

module.exports = app;
