// Pure helpers for session booking — extracted so they're easy to unit-test
// without touching the database.

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function dayFromDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return DAYS[d.getDay()];
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function fitsAvailability(start, end, slots) {
  return slots.some((s) => s.start_time <= start && s.end_time >= end);
}

function hasConflict(start, end, existingSessions) {
  return existingSessions.some((s) => overlaps(start, end, s.start_time, s.end_time));
}

const STATUS_TRANSITIONS = {
  requested: { confirmed: "tutor", cancelled: "either", completed: null },
  confirmed: { completed: "tutor", cancelled: "either", confirmed: null },
  completed: { confirmed: null, cancelled: null, completed: null },
  cancelled: { confirmed: null, cancelled: null, completed: null },
};

function canTransition(from, to, actor) {
  const allowed = STATUS_TRANSITIONS[from]?.[to];
  if (!allowed) return false;
  if (allowed === "either") return actor === "student" || actor === "tutor";
  return allowed === actor;
}

module.exports = { dayFromDate, overlaps, fitsAvailability, hasConflict, canTransition };
