// server/db.js
// SQLite-backed persistence for SkillBridge.
// The database file is created at the project root as skillbridge.db.
// Routes keep using this module, so the frontend/API contract stays the same.

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, "..", "skillbridge.db"));

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dept TEXT NOT NULL,
    initials TEXT NOT NULL,
    online INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 0,
    reviews INTEGER NOT NULL DEFAULT 0,
    swaps INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS user_skills (
    user_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('offer', 'want')),
    PRIMARY KEY (user_id, skill_id, type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER,
    to_id INTEGER,
    offer TEXT,
    want TEXT NOT NULL,
    type TEXT NOT NULL,
    msg TEXT NOT NULL,
    time_text TEXT NOT NULL DEFAULT 'Just now',
    status TEXT NOT NULL DEFAULT 'sent',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (to_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    with_user TEXT NOT NULL,
    skill TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    dur INTEGER NOT NULL DEFAULT 60,
    color TEXT NOT NULL DEFAULT '#10B981',
    reviewed INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY,
    coins INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS coin_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    change INTEGER NOT NULL,
    date_text TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const seedUsers = [
  // [id, name, dept, initials, online, rating, reviews, swaps, estate, lat, lng]
  [1, "Bill Amani", "Technology", "BA", 1, 4.9, 23, 12, "Kileleshwa, Nairobi", -1.2762, 36.7816],
  [2, "Jessica", "Design", "J", 1, 4.8, 17, 8, "Lavington, Nairobi", -1.2790, 36.7690],
  [3, "William Kasongo", "Business", "WK", 0, 5.0, 31, 15, "Karen, Nairobi", -1.3192, 36.7076],
  [4, "K.Dot", "Music & Arts", "KD", 1, 4.7, 12, 6, "Westlands, Nairobi", -1.2676, 36.8108],
  [5, "La Pulga", "Fitness & Sports", "LP", 0, 4.9, 40, 20, "Kilimani, Nairobi", -1.2921, 36.7833],
  [6, "Walter White", "Academic Subjects", "WW", 1, 4.6, 19, 9, "South B, Nairobi", -1.3095, 36.8280],
  [7, "Bruce Wayne", "Business", "BW", 0, 4.8, 22, 11, "Runda, Nairobi", -1.2136, 36.8125],
  [8, "Lelouch", "Life Skills", "L", 1, 4.5, 8, 4, "Kasarani, Nairobi", -1.2233, 36.8967],
  [9, "Naruto Uzumaki", "Fitness & Sports", "NU", 1, 4.7, 14, 7, "Embakasi, Nairobi", -1.3242, 36.8938],
  [10, "Ichigoat", "Fitness & Sports", "IG", 0, 4.9, 26, 13, "Rongai, Kajiado", -1.3958, 36.7539],
  [11, "Jordan Lee", "Languages", "JL", 1, 4.8, 17, 8, "Ngong, Kajiado", -1.3529, 36.6564],
  [12, "Priya Sharma", "Academic Subjects", "PS", 0, 5.0, 31, 15, "Thika Road, Nairobi", -1.2192, 36.8896],
  [13, "Amina Farah", "Agriculture", "AF", 1, 4.9, 18, 9, "Ruiru, Kiambu", -1.1466, 36.9615],
  [14, "Samuel Mwangi", "Agriculture", "SM", 0, 4.6, 11, 5, "Limuru, Kiambu", -1.1122, 36.6417],
];

const userSkills = {
  1: { offer: ["AI & Automation", "Web Development", "Python"], want: ["UI/UX Design", "Public Speaking", "Sales"] },
  2: { offer: ["UI/UX Design", "Figma", "Content Creation"], want: ["Web Development", "Data Analysis", "Digital Marketing"] },
  3: { offer: ["Sales", "Taxes", "Digital Marketing"], want: ["Web Development", "Cybersecurity", "Public Speaking"] },
  4: { offer: ["Music Production", "Songwriting", "Content Creation"], want: ["Digital Marketing", "Sales", "AI & Automation"] },
  5: { offer: ["Football Coaching", "Fitness Training"], want: ["Sales", "Digital Marketing", "Public Speaking"] },
  6: { offer: ["Chemistry", "Academic Tutoring"], want: ["UI/UX Design", "Public Speaking", "Sales"] },
  7: { offer: ["Cybersecurity", "Cloud Computing", "Sales"], want: ["Public Speaking", "Content Creation", "AI & Automation"] },
  8: { offer: ["Public Speaking", "Strategy & Planning"], want: ["Web Development", "Cybersecurity", "Digital Marketing"] },
  9: { offer: ["Fitness Training", "Public Speaking"], want: ["AI & Automation", "Cloud Computing", "Sales"] },
  10: { offer: ["Karate", "Fitness Training"], want: ["Web Development", "Digital Marketing", "Music Production"] },
  11: { offer: ["Spanish", "French", "Translation"], want: ["Web Development", "Data Analysis", "Cybersecurity"] },
  12: { offer: ["Data Analysis", "Statistics", "Academic Tutoring"], want: ["Web Development", "Cybersecurity", "UI/UX Design"] },
  13: { offer: ["Agronomy", "Soil Health", "Irrigation Systems", "Crop Disease Management"], want: ["Digital Marketing", "Data Analysis", "Web Development"] },
  14: { offer: ["Farm Tech", "Livestock Management", "Organic Farming"], want: ["Sales", "Content Creation", "AI & Automation"] },
};

const seed = db.transaction(() => {
  if (db.prepare("SELECT COUNT(*) AS count FROM users").get().count > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, dept, initials, online, rating, reviews, swaps, estate, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSkill = db.prepare("INSERT OR IGNORE INTO skills (name) VALUES (?)");
  const getSkill = db.prepare("SELECT id FROM skills WHERE name = ?");
  const insertUserSkill = db.prepare(`
    INSERT OR IGNORE INTO user_skills (user_id, skill_id, type)
    VALUES (?, ?, ?)
  `);

  for (const user of seedUsers) insertUser.run(...user);

  for (const [userId, groups] of Object.entries(userSkills)) {
    for (const type of ["offer", "want"]) {
      for (const name of groups[type]) {
        insertSkill.run(name);
        insertUserSkill.run(Number(userId), getSkill.get(name).id, type);
      }
    }
  }

  const insertRequest = db.prepare(`
    INSERT INTO requests
      (id, from_id, to_id, offer, want, type, msg, time_text, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRequest.run(1, 2, 1, "UI/UX Design", "Web Development", "swap",
    "Hey! I want to learn web dev. I could teach you UI/UX in return!", "10m ago", "incoming");
  insertRequest.run(2, 4, 1, "Music Production", "AI & Automation", "swap",
    "I want to learn AI & Automation for my next project. Happy to teach music production!", "2h ago", "incoming");
  insertRequest.run(3, 11, 1, null, "Data Analysis", "coin",
    "I used 3 Skill Coins for this. I really need Data Analysis skills!", "1d ago", "sent");

  const insertSession = db.prepare(`
    INSERT INTO sessions (id, with_user, skill, date, time, dur, color, reviewed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSession.run(1, "Jessica", "UI/UX Design basics", "2026-06-26", "14:00", 60, "#1FD4A0", 0);
  insertSession.run(2, "K.Dot", "Music Production intro", "2026-06-28", "10:30", 45, "#F5B731", 0);
  insertSession.run(3, "Jordan Lee", "Spanish for beginners", "2026-06-30", "16:00", 60, "#8B6BF5", 0);

  db.prepare("INSERT INTO profiles (user_id, coins) VALUES (1, 12)").run();
  const history = db.prepare(`
    INSERT INTO coin_history (id, user_id, action, change, date_text)
    VALUES (?, 1, ?, ?, ?)
  `);
  history.run(1, "Joined SkillBridge", 10, "1 month ago");
  history.run(2, "Completed swap with Jordan Lee", 2, "10h ago");
});

// ---------------------------------------------------------------------------
// Migration: add estate/coordinates to users and category to skills.
//
// This runs on every startup (not just first-time seeding) — and BEFORE
// seed() — so it also upgrades a database that was already created and
// pushed before these columns existed (e.g. Rick's live skillbridge.db on
// GitHub), and so seed()'s own INSERT (which references estate/lat/lng)
// has somewhere to write on a truly fresh database too. SQLite has no
// "ADD COLUMN IF NOT EXISTS", so we check PRAGMA table_info first.
// ---------------------------------------------------------------------------
function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

if (!columnExists("users", "estate")) {
  db.exec(`
    ALTER TABLE users ADD COLUMN estate TEXT;
    ALTER TABLE users ADD COLUMN lat REAL;
    ALTER TABLE users ADD COLUMN lng REAL;
  `);
}
if (!columnExists("skills", "category")) {
  db.exec(`ALTER TABLE skills ADD COLUMN category TEXT;`);
}

seed();

// Backfill new seed users that were added AFTER an install was already
// seeded (e.g. Amina Farah / Samuel Mwangi, added when Agriculture skills
// were introduced) — seed() only ever runs once on a truly empty database,
// so anyone whose skillbridge.db already existed before this change needs
// these rows inserted directly instead.
{
  const existingIds = new Set(db.prepare("SELECT id FROM users").all().map((r) => r.id));
  const newUsers = seedUsers.filter((u) => !existingIds.has(u[0]));
  if (newUsers.length > 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, dept, initials, online, rating, reviews, swaps, estate, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertSkill = db.prepare("INSERT OR IGNORE INTO skills (name) VALUES (?)");
    const getSkill = db.prepare("SELECT id FROM skills WHERE name = ?");
    const insertUserSkill = db.prepare(`
      INSERT OR IGNORE INTO user_skills (user_id, skill_id, type)
      VALUES (?, ?, ?)
    `);
    for (const user of newUsers) {
      insertUser.run(...user);
      const groups = userSkills[user[0]];
      if (!groups) continue;
      for (const type of ["offer", "want"]) {
        for (const name of groups[type]) {
          insertSkill.run(name);
          insertUserSkill.run(user[0], getSkill.get(name).id, type);
        }
      }
    }
  }
}

// Backfill estate/coordinates for any user row still missing them (covers
// both a freshly-migrated old database and anyone added after seeding).
const estateBackfill = new Map(seedUsers.map((u) => [u[0], { estate: u[8], lat: u[9], lng: u[10] }]));
const usersMissingLocation = db.prepare("SELECT id FROM users WHERE estate IS NULL").all();
const updateUserLocation = db.prepare("UPDATE users SET estate = ?, lat = ?, lng = ? WHERE id = ?");
for (const { id } of usersMissingLocation) {
  const loc = estateBackfill.get(id) || { estate: "Nairobi", lat: -1.2921, lng: 36.8219 }; // CBD fallback
  updateUserLocation.run(loc.estate, loc.lat, loc.lng, id);
}

// Backfill skill categories using SkillBridge's existing CATEGORIES taxonomy
// (Technology, Design, Business, Languages, Music & Arts, Fitness & Sports,
// Academic Subjects, Life Skills) via keyword matching against the skill
// name. Anything unmatched falls back to "Life Skills" rather than being
// left uncategorized, so /api/skills?tag= always has something to filter.
const CATEGORY_KEYWORDS = {
  Technology: ["web development", "ai & automation", "python", "cybersecurity", "cloud computing", "data analysis", "statistics"],
  Design: ["ui/ux design", "figma"],
  Business: ["sales", "taxes", "digital marketing", "strategy & planning"],
  Languages: ["spanish", "french", "translation"],
  "Music & Arts": ["music production", "songwriting", "content creation"],
  "Fitness & Sports": ["football coaching", "fitness training", "karate"],
  "Academic Subjects": ["chemistry", "academic tutoring"],
  Agriculture: [
    "agronomy", "soil health", "irrigation systems", "crop disease management",
    "farm tech", "livestock management", "organic farming", "pest management",
    "urban farming", "greenhouse",
  ],
};
function categorize(name) {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Life Skills";
}
const skillsMissingCategory = db.prepare("SELECT id, name FROM skills WHERE category IS NULL").all();
const updateSkillCategory = db.prepare("UPDATE skills SET category = ? WHERE id = ?");
for (const skill of skillsMissingCategory) {
  updateSkillCategory.run(categorize(skill.name), skill.id);
}

function getSkillsForUser(userId, type) {
  return db.prepare(`
    SELECT s.name
    FROM skills s
    JOIN user_skills us ON us.skill_id = s.id
    WHERE us.user_id = ? AND us.type = ?
    ORDER BY s.name
  `).all(userId, type).map(row => row.name);
}

export function getUsers() {
  return db.prepare("SELECT * FROM users ORDER BY id").all().map(user => ({
    id: user.id,
    name: user.name,
    dept: user.dept,
    initials: user.initials,
    online: Boolean(user.online),
    rating: user.rating,
    reviews: user.reviews,
    swaps: user.swaps,
    estate: user.estate,
    lat: user.lat,
    lng: user.lng,
    offers: getSkillsForUser(user.id, "offer"),
    wants: getSkillsForUser(user.id, "want"),
  }));
}

export function getUserById(id) {
  return getUsers().find(user => user.id === Number(id));
}

// ---------------------------------------------------------------------------
// Downstream API — served TO Farmers-AgroConnect (see
// src/documentation/API_NEEDS_DOWNSTREAM.md and ENDPOINT_LIST.md for the
// agreed contract). SkillBridge's "students who teach a skill" naturally
// become AgroConnect's "experts" — same underlying user, different lens.
// ---------------------------------------------------------------------------

// Haversine distance in km — used for ?sort=proximity
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /experts?estate={estate}&sort={rating|proximity}&lat=&lng=
// "sort=proximity" needs a reference point (lat/lng query params) since the
// caller (AgroConnect) is asking "nearest to *this farmer*", not to us.
export function getExperts({ estate, sort, lat, lng } = {}) {
  let experts = getUsers().map((u) => ({
    id: u.id,
    name: u.name,
    estate: u.estate,
    coordinates: { lat: u.lat, lng: u.lng },
    rating: u.rating,
    reviews: u.reviews,
    skills: u.offers,
  }));

  if (estate) {
    const needle = estate.toLowerCase();
    experts = experts.filter((e) => e.estate?.toLowerCase().includes(needle));
  }

  if (sort === "proximity" && lat != null && lng != null) {
    experts = experts
      .map((e) => ({ ...e, distanceKm: Math.round(distanceKm(Number(lat), Number(lng), e.coordinates.lat, e.coordinates.lng) * 10) / 10 }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  } else {
    experts.sort((a, b) => b.rating - a.rating); // default / "sort=rating"
  }

  return experts;
}

export function getExpertById(id) {
  const u = getUserById(id);
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    dept: u.dept,
    estate: u.estate,
    coordinates: { lat: u.lat, lng: u.lng },
    rating: u.rating,
    reviews: u.reviews,
    swaps: u.swaps,
    skills: u.offers,
  };
}

// GET /experts/{id}/reviews — SkillBridge only stores aggregate rating/review
// counts today (no per-review text), so this returns the aggregate trust
// metrics AgroConnect's needs statement actually asks for.
export function getExpertReviews(id) {
  const u = getUserById(id);
  if (!u) return null;
  return { expertId: u.id, rating: u.rating, reviews: u.reviews, completedSwaps: u.swaps };
}

// GET /experts/{id}/availability — SkillBridge doesn't have a dedicated
// "availability slots" table; it infers open slots from a fixed daily
// template (09:00/11:00/14:00/16:00) for the next 7 days, minus whatever
// that expert already has booked in the sessions table. Good enough to
// demo a working contract; a real implementation would let each student
// set their own weekly availability.
const DAILY_SLOT_TEMPLATE = ["09:00", "11:00", "14:00", "16:00"];

export function getExpertAvailability(id) {
  const u = getUserById(id);
  if (!u) return null;

  const bookedByDate = new Set(
    getSessions()
      .filter((s) => s.with.toLowerCase() === u.name.toLowerCase())
      .map((s) => `${s.date}_${s.time}`)
  );

  const slots = [];
  const today = new Date();
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    const dateStr = d.toISOString().slice(0, 10);
    for (const time of DAILY_SLOT_TEMPLATE) {
      if (!bookedByDate.has(`${dateStr}_${time}`)) {
        slots.push({ date: dateStr, time, durationMinutes: 60 });
      }
    }
  }
  return { expertId: u.id, slots };
}

// ---------------------------------------------------------------------------
// GET /skills?tag={category} — categorized skill catalogue for AgroConnect's
// filter dropdown. Categories reuse SkillBridge's existing taxonomy (see
// src/data.js CATEGORIES) rather than inventing a separate one.
// ---------------------------------------------------------------------------
export function getSkillsByCategory(tag) {
  const rows = db.prepare(`
    SELECT s.name, s.category, COUNT(us.user_id) AS offeredBy
    FROM skills s
    LEFT JOIN user_skills us ON us.skill_id = s.id AND us.type = 'offer'
    ${tag ? "WHERE s.category = ?" : ""}
    GROUP BY s.id
    ORDER BY s.category, s.name
  `).all(...(tag ? [tag] : []));
  return rows;
}

export function getRequests() {
  return db.prepare(`
    SELECT id, from_id AS fromId, to_id AS toId, offer, want, type,
           msg, time_text AS time, status
    FROM requests
    ORDER BY id
  `).all();
}

export function addRequest({ fromId, toId, offer, want, type, msg }) {
  const result = db.prepare(`
    INSERT INTO requests (from_id, to_id, offer, want, type, msg, time_text, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Just now', 'sent')
  `).run(fromId ?? null, toId ?? fromId ?? null, offer ?? null, want, type, msg);

  return db.prepare(`
    SELECT id, from_id AS fromId, to_id AS toId, offer, want, type,
           msg, time_text AS time, status
    FROM requests WHERE id = ?
  `).get(result.lastInsertRowid);
}

// POST /requests (downstream) — AgroConnect submits { farmerName, topic,
// expertId, date } rather than SkillBridge's native swap-request shape.
// Requests created this way carry type 'consult' so they're visually and
// programmatically distinguishable from internal skill swaps / coin
// requests. There's no dedicated farmer_name/date column (out of scope for
// this lab's schema), so those two details are folded into msg — fine for
// a Week-lab integration, but a production version would add real columns.
export function addConsultationRequest({ farmerName, topic, expertId, date }) {
  const msg = `Consultation request from ${farmerName} (via Farmers-AgroConnect) for ${date}.`;
  return addRequest({ fromId: null, toId: Number(expertId), offer: null, want: topic, type: "consult", msg });
}

export function updateRequestStatus(id, status) {
  const result = db.prepare("UPDATE requests SET status = ? WHERE id = ?").run(status, id);
  if (!result.changes) return null;
  return db.prepare(`
    SELECT id, from_id AS fromId, to_id AS toId, offer, want, type,
           msg, time_text AS time, status
    FROM requests WHERE id = ?
  `).get(id);
}

export function removeRequest(id) {
  db.prepare("DELETE FROM requests WHERE id = ?").run(id);
}

export function getSessions() {
  return db.prepare(`
    SELECT id, with_user AS "with", skill, date, time, dur, color,
           reviewed
    FROM sessions ORDER BY date, time
  `).all().map(s => ({ ...s, reviewed: Boolean(s.reviewed) }));
}

export function addSession({ withUser, skill, date, time, dur, color }) {
  const result = db.prepare(`
    INSERT INTO sessions (with_user, skill, date, time, dur, color, reviewed)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(withUser, skill, date, time, dur || 60, color || "#10B981");

  const s = db.prepare(`
    SELECT id, with_user AS "with", skill, date, time, dur, color, reviewed
    FROM sessions WHERE id = ?
  `).get(result.lastInsertRowid);
  return { ...s, reviewed: Boolean(s.reviewed) };
}

export function markSessionReviewed(id) {
  const result = db.prepare("UPDATE sessions SET reviewed = 1 WHERE id = ?").run(id);
  if (!result.changes) return null;
  const s = db.prepare(`
    SELECT id, with_user AS "with", skill, date, time, dur, color, reviewed
    FROM sessions WHERE id = ?
  `).get(id);
  return { ...s, reviewed: Boolean(s.reviewed) };
}

export function getProfile() {
  const profile = db.prepare("SELECT coins FROM profiles WHERE user_id = 1").get();
  return {
    offers: getSkillsForUser(1, "offer"),
    wants: getSkillsForUser(1, "want"),
    coins: profile?.coins ?? 0,
    coinHistory: db.prepare(`
      SELECT id, action, change, date_text AS date
      FROM coin_history WHERE user_id = 1
      ORDER BY id DESC
    `).all(),
  };
}

export function addProfileSkill(type, value) {
  const name = value.trim();
  const insertSkill = db.prepare("INSERT OR IGNORE INTO skills (name) VALUES (?)");
  insertSkill.run(name);
  const skill = db.prepare("SELECT id FROM skills WHERE name = ?").get(name);
  db.prepare(`
    INSERT OR IGNORE INTO user_skills (user_id, skill_id, type)
    VALUES (1, ?, ?)
  `).run(skill.id, type);
  return getProfile();
}

export function removeProfileSkill(type, value) {
  const skill = db.prepare("SELECT id FROM skills WHERE name = ?").get(value.trim());
  if (skill) {
    db.prepare(`
      DELETE FROM user_skills
      WHERE user_id = 1 AND skill_id = ? AND type = ?
    `).run(skill.id, type);
  }
  return getProfile();
}

export function adjustCoins(delta, reason) {
  const current = db.prepare("SELECT coins FROM profiles WHERE user_id = 1").get()?.coins ?? 0;
  if (current + delta < 0) {
    const err = new Error("Insufficient Skill Coins");
    err.status = 400;
    throw err;
  }

  const transaction = db.transaction(() => {
    db.prepare("UPDATE profiles SET coins = coins + ? WHERE user_id = 1").run(delta);
    db.prepare(`
      INSERT INTO coin_history (user_id, action, change, date_text)
      VALUES (1, ?, ?, 'Just now')
    `).run(reason || (delta > 0 ? "Coins earned" : "Coins spent"), delta);
  });
  transaction();
  return getProfile();
}

export function closeDatabase() {
  db.close();
}

