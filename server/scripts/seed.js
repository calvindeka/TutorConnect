// Seed script — creates an admin, a couple of approved tutors with availability,
// a pending tutor application, and a few sessions + reviews so the demo has data.
// Safe to re-run: deletes everything and reseeds.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcrypt");
const pool = require("../config/db");

async function main() {
  const conn = await pool.getConnection();
  try {
    console.log("Seeding TutorConnect…");

    // Wipe in FK-safe order
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const t of ["reviews", "sessions", "availability", "tutor_subjects", "tutor_profiles", "users"]) {
      await conn.query(`DELETE FROM ${t}`);
      await conn.query(`ALTER TABLE ${t} AUTO_INCREMENT = 1`);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    const hash = (pw) => bcrypt.hash(pw, 10);

    // Admin
    await conn.query(
      "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, 'admin')",
      ["admin@kenyon.edu", await hash("admin123"), "Admin", "User"]
    );

    // Students
    const students = [
      ["alex.smith@kenyon.edu", "Alex", "Smith"],
      ["jordan.lee@kenyon.edu", "Jordan", "Lee"],
      ["sam.wright@kenyon.edu", "Sam", "Wright"],
    ];
    for (const [email, fn, ln] of students) {
      await conn.query(
        "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, 'student')",
        [email, await hash("student123"), fn, ln]
      );
    }

    // Tutors (approved)
    const approvedTutors = [
      {
        email: "jane.doe@kenyon.edu", fn: "Jane", ln: "Doe",
        bio: "Junior CS major, 3.85 GPA. Tutored algorithms and data structures for 2 years. Patient with beginners.",
        gpa: 3.85,
        subjects: ["Intro to Computer Science", "Data Structures", "Algorithms"],
        availability: [
          ["mon", "14:00", "16:00"], ["wed", "10:00", "12:00"], ["fri", "13:00", "15:00"],
        ],
      },
      {
        email: "marcus.wong@kenyon.edu", fn: "Marcus", ln: "Wong",
        bio: "Senior math major. Strong at calculus and linear algebra. Will work through problems step by step.",
        gpa: 3.92,
        subjects: ["Calculus I", "Calculus II", "Linear Algebra", "Statistics"],
        availability: [
          ["tue", "13:00", "17:00"], ["thu", "13:00", "17:00"], ["sat", "10:00", "12:00"],
        ],
      },
      {
        email: "priya.patel@kenyon.edu", fn: "Priya", ln: "Patel",
        bio: "Pre-med, double major in chemistry and biology. Loves explaining the why behind reactions.",
        gpa: 3.78,
        subjects: ["General Chemistry", "Organic Chemistry", "Biology I"],
        availability: [
          ["mon", "18:00", "20:00"], ["wed", "18:00", "20:00"], ["sun", "14:00", "17:00"],
        ],
      },
      {
        email: "tom.kelly@kenyon.edu", fn: "Tom", ln: "Kelly",
        bio: "Econ major. Have TA'd Microeconomics for two semesters. Enjoy real-world examples.",
        gpa: 3.65,
        subjects: ["Microeconomics", "Macroeconomics", "Accounting I"],
        availability: [
          ["tue", "15:00", "18:00"], ["thu", "15:00", "18:00"],
        ],
      },
    ];

    // Pending tutor (so admin dashboard has work to show)
    const pendingTutors = [
      {
        email: "ravi.shah@kenyon.edu", fn: "Ravi", ln: "Shah",
        bio: "Sophomore physics major, 3.7 GPA. Want to help others build intuition for mechanics.",
        gpa: 3.70,
        subjects: ["Physics I", "Physics II"],
      },
    ];

    for (const t of approvedTutors) {
      const [u] = await conn.query(
        "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, 'tutor')",
        [t.email, await hash("tutor123"), t.fn, t.ln]
      );
      const [p] = await conn.query(
        "INSERT INTO tutor_profiles (user_id, bio, status, gpa) VALUES (?, ?, 'approved', ?)",
        [u.insertId, t.bio, t.gpa]
      );
      const [subjRows] = await conn.query(
        `SELECT id, name FROM subjects WHERE name IN (${t.subjects.map(() => "?").join(",")})`,
        t.subjects
      );
      for (const s of subjRows) {
        await conn.query(
          "INSERT INTO tutor_subjects (tutor_profile_id, subject_id) VALUES (?, ?)",
          [p.insertId, s.id]
        );
      }
      for (const [day, st, en] of t.availability) {
        await conn.query(
          "INSERT INTO availability (tutor_profile_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)",
          [p.insertId, day, st, en]
        );
      }
    }

    for (const t of pendingTutors) {
      const [u] = await conn.query(
        "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, 'student')",
        [t.email, await hash("tutor123"), t.fn, t.ln]
      );
      const [p] = await conn.query(
        "INSERT INTO tutor_profiles (user_id, bio, status, gpa) VALUES (?, ?, 'pending', ?)",
        [u.insertId, t.bio, t.gpa]
      );
      const [subjRows] = await conn.query(
        `SELECT id FROM subjects WHERE name IN (${t.subjects.map(() => "?").join(",")})`,
        t.subjects
      );
      for (const s of subjRows) {
        await conn.query(
          "INSERT INTO tutor_subjects (tutor_profile_id, subject_id) VALUES (?, ?)",
          [p.insertId, s.id]
        );
      }
    }

    // Sample sessions + reviews so dashboard isn't empty
    // Find ids
    const [[student1]] = await conn.query("SELECT id FROM users WHERE email = ?", ["alex.smith@kenyon.edu"]);
    const [[student2]] = await conn.query("SELECT id FROM users WHERE email = ?", ["jordan.lee@kenyon.edu"]);
    const [[jane]] = await conn.query(
      "SELECT tp.id AS tpid FROM tutor_profiles tp JOIN users u ON u.id = tp.user_id WHERE u.email = ?",
      ["jane.doe@kenyon.edu"]
    );
    const [[marcus]] = await conn.query(
      "SELECT tp.id AS tpid FROM tutor_profiles tp JOIN users u ON u.id = tp.user_id WHERE u.email = ?",
      ["marcus.wong@kenyon.edu"]
    );
    const [[csSubj]] = await conn.query("SELECT id FROM subjects WHERE name = ?", ["Intro to Computer Science"]);
    const [[calcSubj]] = await conn.query("SELECT id FROM subjects WHERE name = ?", ["Calculus I"]);

    // Past completed session by Alex with Jane → has a review
    const today = new Date();
    const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const future = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fmtDate = (d) => d.toISOString().slice(0, 10);

    const [pastSession] = await conn.query(
      `INSERT INTO sessions (student_id, tutor_profile_id, subject_id, session_date, start_time, end_time, status, location, notes)
       VALUES (?, ?, ?, ?, '14:00', '15:00', 'completed', 'Olin Library Room 204', 'Help with recursion')`,
      [student1.id, jane.tpid, csSubj.id, fmtDate(past)]
    );
    await conn.query(
      `INSERT INTO reviews (session_id, student_id, tutor_profile_id, rating, comment)
       VALUES (?, ?, ?, 5, 'Jane explained recursion really clearly. Patient and thoughtful.')`,
      [pastSession.insertId, student1.id, jane.tpid]
    );

    // Upcoming confirmed session
    await conn.query(
      `INSERT INTO sessions (student_id, tutor_profile_id, subject_id, session_date, start_time, end_time, status, location, notes)
       VALUES (?, ?, ?, ?, '13:00', '14:00', 'confirmed', 'Math Center', 'Going over related rates')`,
      [student2.id, marcus.tpid, calcSubj.id, fmtDate(future)]
    );

    // Pending request for tutor to act on
    await conn.query(
      `INSERT INTO sessions (student_id, tutor_profile_id, subject_id, session_date, start_time, end_time, status, location, notes)
       VALUES (?, ?, ?, ?, '15:00', '16:00', 'requested', 'Olin Library', 'Linked lists trouble')`,
      [student2.id, jane.tpid, csSubj.id, fmtDate(future)]
    );

    console.log("\nSeed complete!");
    console.log("Test accounts (password is 'admin123' / 'student123' / 'tutor123'):");
    console.log("  admin@kenyon.edu    (admin)");
    console.log("  alex.smith@kenyon.edu, jordan.lee@kenyon.edu, sam.wright@kenyon.edu (students)");
    console.log("  jane.doe@kenyon.edu, marcus.wong@kenyon.edu, priya.patel@kenyon.edu, tom.kelly@kenyon.edu (tutors)");
    console.log("  ravi.shah@kenyon.edu (pending tutor application)");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
