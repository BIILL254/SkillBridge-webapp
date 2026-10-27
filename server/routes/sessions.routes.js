// server/routes/sessions.routes.js
import { Router } from "express";
import { getSessions, getSessionOwner, addSession, markSessionReviewed } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  res.json(await getSessions(req.user.id)); // only MY sessions
}));

// A real calendar date in YYYY-MM-DD (rejects 2026-02-30, which a plain regex would let through)
function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

router.post("/", asyncHandler(async (req, res) => {
  const { with: withUser, skill, date, time, dur, color } = req.body;

  // validate first, write second — nothing below the checks runs unless all pass
  if (!withUser || !skill || !date || !time) {
    return res.status(400).json({ error: "with, skill, date, and time are required" });
  }
  if ([withUser, skill, date, time].some((v) => typeof v !== "string") || !withUser.trim() || !skill.trim()) {
    return res.status(400).json({ error: "with and skill must be non-empty strings; date and time must be strings" });
  }
  if (!isRealDate(date)) {
    return res.status(400).json({ error: "date must be a real date in YYYY-MM-DD format" });
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return res.status(400).json({ error: "time must be in 24-hour HH:MM format" });
  }
  if (dur !== undefined && (!Number.isInteger(dur) || dur < 1 || dur > 1440)) {
    return res.status(400).json({ error: "dur must be a whole number of minutes between 1 and 1440" });
  }
  if (color !== undefined && !(typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color))) {
    return res.status(400).json({ error: "color must be a hex color like #10B981" });
  }

  const newSession = await addSession({
    userId: req.user.id, // owner comes from the verified token, never from the body
    withUser: withUser.trim(),
    skill: skill.trim(),
    date,
    time,
    dur,
    color,
  });

  res.status(201).json(newSession);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const owner = await getSessionOwner(id);
  if (owner === undefined) return res.status(404).json({ error: "Session not found" });
  if (owner !== req.user.id) {
    return res.status(403).json({ error: "You can only change your own sessions" });
  }
  const updated = await markSessionReviewed(id);
  res.json(updated);
}));

export default router;
