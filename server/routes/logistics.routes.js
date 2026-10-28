// server/routes/logistics.routes.js
//
// The frontend calls these SkillBridge endpoints, and this file calls
// Maji Website on the frontend's behalf. Keeping the external call
// server-side means MAJI_API_KEY (once real) never has to touch the
// browser, and it gives us one place to add caching/retry logic later if
// Maji Website turns out to be slow or flaky.
//
// Updated after receiving Maji's real openapi.yaml — see the comment block
// at the top of server/services/majiClient.js for what changed and why.
// Notably: there is no per-estate "payment methods for checkout" endpoint
// in Maji's real contract (only a single customer's own saved method), so
// that route has been removed rather than left pointing at something that
// doesn't exist.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getStations,
  getTopRatedVendors,
  getAllVendors,
  getEstates,
  getDelivery,
  createDelivery,
  registerDriverInterest,
} from "../services/majiClient.js";

const router = Router();

// This is a proxy to a partner's service: keep it (especially the write routes)
// behind login so anonymous traffic can't burn Maji's quota or spam it.
router.use(requireAuth);

// Vendor locations from Maji (their GET /api/vendors/locations). ?estate= is
// optional; if you send it, it must not be blank (Maji answers 400 to that).
router.get("/stations", async (req, res, next) => {
  const { estate } = req.query;
  if (estate !== undefined && (typeof estate !== "string" || !estate.trim())) {
    return res.status(400).json({ error: "estate must be a non-empty string" });
  }
  try {
    res.json(await getStations(estate));
  } catch (err) { next(err); }
});

// Every Maji vendor, with contact details (Maji's GET /api/vendors/all).
// ?estate= is optional but must not be blank. Needs a student login (router-level).
router.get("/vendors/all", async (req, res, next) => {
  const { estate } = req.query;
  if (estate !== undefined && (typeof estate !== "string" || !estate.trim())) {
    return res.status(400).json({ error: "estate must be a non-empty string" });
  }
  try {
    res.json(await getAllVendors(estate));
  } catch (err) { next(err); }
});

// Highest-rated verified vendor in each estate (Maji's GET /api/vendors/top-rated).
router.get("/vendors/top-rated", async (req, res, next) => {
  try {
    res.json(await getTopRatedVendors());
  } catch (err) { next(err); }
});

// ?deliveryStatus=active|inactive, matches Maji's real /estates contract
router.get("/estates", async (req, res, next) => {
  const { deliveryStatus } = req.query;
  if (deliveryStatus !== undefined && !["active", "inactive"].includes(deliveryStatus)) {
    return res.status(400).json({ error: "deliveryStatus must be 'active' or 'inactive'" });
  }
  try {
    res.json(await getEstates(deliveryStatus));
  } catch (err) { next(err); }
});

// These two correctly surface a 501 — Maji's real API has no delivery
// tracking capability at all (see CONTRACT_QUESTIONS.md Question 1).
// Kept rather than removed so the gap is visible in the running app
// instead of silently disappearing.
router.get("/deliveries/:id", async (req, res, next) => {
  try {
    res.json(await getDelivery(req.params.id));
  } catch (err) { next(err); }
});

router.post("/deliveries", async (req, res, next) => {
  try {
    res.status(201).json(await createDelivery());
  } catch (err) { next(err); }
});

// POST /logistics/estates/:estateId/driver-interests — not currently used
// by any SkillBridge UI, but wired up since it's a real Maji capability.
router.post("/estates/:estateId/driver-interests", async (req, res, next) => {
  const { userId, contactMethod } = req.body;
  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "userId is required and must be a non-empty string" });
  }
  if (contactMethod !== undefined && typeof contactMethod !== "string") {
    return res.status(400).json({ error: "contactMethod must be a string" });
  }
  try {
    res.status(201).json(await registerDriverInterest(req.params.estateId, req.body));
  } catch (err) { next(err); }
});

export default router;
