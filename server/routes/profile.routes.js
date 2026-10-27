// server/routes/profile.routes.js
import { Router } from "express";
import {
  getProfile,
  addProfileSkill,
  removeProfileSkill,
  adjustCoins,
  updateOwnProfileInfo,
} from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// The app never awards more than 2 coins at once; 10 leaves headroom while
// stopping "give myself a million coins" in one request.
const MAX_COIN_GRANT = 10;

const router = Router();

// Every route here is "my profile" — requireAuth so req.user.id is always
// available, instead of the old hardcoded user_id = 1.
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  res.json(await getProfile(req.user.id));
}));

// Self-service edit of basic info (currently just dept/estate — the only
// way estate ever gets set for a user who signed up themselves, since
// signup itself doesn't collect it).
router.patch("/", asyncHandler(async (req, res) => {
  const { dept, estate } = req.body;
  const updated = await updateOwnProfileInfo(req.user.id, { dept, estate });
  res.json(updated);
}));

router.post("/skills", asyncHandler(async (req, res) => {
  const { type, value } = req.body;

  // validate first, write second: nothing below runs unless every check passes
  if (!["offer", "want"].includes(type)) {
    return res.status(400).json({ error: "type must be 'offer' or 'want'" });
  }
  if (typeof value !== "string" || !value.trim()) {
    return res.status(400).json({ error: "value must be a non-empty string" });
  }
  const skill = value.trim();
  if (skill.length > 60) {
    return res.status(400).json({ error: "value must be 60 characters or fewer" });
  }

  const profile = await getProfile(req.user.id);
  const key = type === "offer" ? "offers" : "wants";
  if (profile[key].some(s => s.toLowerCase() === skill.toLowerCase())) {
    return res.status(409).json({ error: "Skill already in list" });
  }

  await addProfileSkill(req.user.id, type, skill);

  if (type === "offer") {
    await adjustCoins(req.user.id, 1, `Added skill: ${skill}`);
  }

  res.status(201).json(await getProfile(req.user.id));
}));

router.delete("/skills/:type/:value", asyncHandler(async (req, res) => {
  const { type, value } = req.params;
  if (!["offer", "want"].includes(type)) {
    return res.status(400).json({ error: "type must be 'offer' or 'want'" });
  }

  await removeProfileSkill(req.user.id, type, decodeURIComponent(value));
  res.json(await getProfile(req.user.id));
}));

router.patch("/coins", asyncHandler(async (req, res) => {
  const { delta, reason } = req.body;
  if (typeof delta !== "number") {
    return res.status(400).json({ error: "delta must be a number" });
  }
  // A single call can never grant more than MAX_COIN_GRANT, and only whole
  // coins. (Spending large amounts is still caught by the insufficient-coins check.)
  if (!Number.isInteger(delta) || delta > MAX_COIN_GRANT) {
    return res.status(400).json({ error: `delta must be a whole number of at most ${MAX_COIN_GRANT}` });
  }
  if (reason !== undefined && reason !== null && (typeof reason !== "string" || reason.length > 120)) {
    return res.status(400).json({ error: "reason must be a string of at most 120 characters" });
  }

  await adjustCoins(req.user.id, delta, reason);
  res.json(await getProfile(req.user.id));
}));

export default router;
