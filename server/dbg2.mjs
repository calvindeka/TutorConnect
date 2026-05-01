process.env.DB_NAME = "tutorconnect_test";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pool = require("./config/db");

(async () => {
  function nextTuesday() {
    const d = new Date();
    while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const date = nextTuesday();
  console.log("nextTuesday:", date);
  const day = ["sun","mon","tue","wed","thu","fri","sat"][new Date(date + "T00:00:00").getDay()];
  console.log("DAY_FROM_DATE:", day);
  const [rows] = await pool.query("SELECT day_of_week, start_time, end_time FROM availability WHERE day_of_week = ?", [day]);
  console.log("rows:", rows);
  console.log("typeof start_time:", typeof rows[0]?.start_time, "value:", JSON.stringify(rows[0]?.start_time));
  await pool.end();
})();
