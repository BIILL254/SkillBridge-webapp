// server/routes/skills.routes.js
//
// Downstream API — GET /skills?tag={category}, per Needs Statement 2 in
// API_NEEDS_DOWNSTREAM.md. Categories reuse SkillBridge's own taxonomy
// (src/data.js CATEGORIES) — see the categorize() backfill in server/db.js
// for how each skill gets assigned one.

import { Router } from "express";
import { getSkillsByCategory } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  res.json(getSkillsByCategory(req.query.tag));
});

export default router;
