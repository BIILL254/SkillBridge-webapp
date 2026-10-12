// server/routes/experts.routes.js
//
// Downstream API — SkillBridge is the PROVIDER here, and Farmers-AgroConnect
// is the CONSUMER. These routes implement the exact contract documented in
// src/documentation/API_NEEDS_DOWNSTREAM.md and ENDPOINT_LIST.md ("Downstream
// API Endpoints — Provided by SkillBridge for Farmers-AgroConnect"). Anyone
// on AgroConnect's team can call these directly once this server is
// reachable from their side — no SkillBridge-specific auth is wired up yet
// since that was flagged as a later concern in the needs doc (Bearer token /
// OAuth), so treat these as open reads / writes for now.

import { Router } from "express";
import {
  getExperts,
  getExpertById,
  getExpertAvailability,
  getExpertReviews,
  addConsultationRequest,
} from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// GET /api/experts?estate={estate}&sort={rating|proximity}&lat=&lng=
router.get("/", asyncHandler(async (req, res) => {
  const { estate, sort, lat, lng } = req.query;

  // validate first: contract says sort is an enum and lat/lng are numbers
  if (sort !== undefined && !["rating", "proximity"].includes(sort)) {
    return res.status(400).json({ error: "sort must be 'rating' or 'proximity'" });
  }
  for (const [name, value, limit] of [["lat", lat, 90], ["lng", lng, 180]]) {
    if (value !== undefined && !(value.trim() !== "" && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit)) {
      return res.status(400).json({ error: `${name} must be a number between -${limit} and ${limit}` });
    }
  }
  if (sort === "proximity" && (lat === undefined || lng === undefined)) {
    return res.status(400).json({ error: "lat and lng are required when sort=proximity" });
  }

  res.json(await getExperts({ estate, sort, lat, lng }));
}));

// GET /api/experts/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const expert = await getExpertById(req.params.id);
  if (!expert) return res.status(404).json({ error: "Expert not found" });
  res.json(expert);
}));

// GET /api/experts/:id/availability
router.get("/:id/availability", asyncHandler(async (req, res) => {
  const availability = await getExpertAvailability(req.params.id);
  if (!availability) return res.status(404).json({ error: "Expert not found" });
  res.json(availability);
}));

// GET /api/experts/:id/reviews
router.get("/:id/reviews", asyncHandler(async (req, res) => {
  const reviews = await getExpertReviews(req.params.id);
  if (!reviews) return res.status(404).json({ error: "Expert not found" });
  res.json(reviews);
}));

export default router;

// POST /api/requests (consultation booking) is handled in requests.routes.js
// so both request types share one table/status flow — see the "consult"
// type branch there. Wrapped in asyncHandler where it's actually mounted
// (requests.routes.js), since it's async now.
// ISO-8601 date-time, e.g. 2026-09-20T10:00:00Z (the contract's `format: date-time`)
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export const consultationHandler = async (req, res) => {
  const { farmerName, topic, expertId, date } = req.body;

  // validate first, write second — every field checked against the contract's ConsultationRequest
  if (!farmerName || !topic || expertId === undefined || expertId === null || !date) {
    return res.status(400).json({ error: "farmerName, topic, expertId, and date are required" });
  }
  if (typeof farmerName !== "string" || !farmerName.trim() || typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "farmerName and topic must be non-empty strings" });
  }
  if (!Number.isInteger(expertId)) {
    return res.status(400).json({ error: "expertId must be an integer" });
  }
  if (typeof date !== "string" || !DATE_TIME.test(date) || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "date must be an ISO-8601 date-time, e.g. 2026-09-20T10:00:00Z" });
  }
  if (!(await getExpertById(expertId))) {
    return res.status(404).json({ error: "expertId does not match any SkillBridge expert" });
  }

  const created = await addConsultationRequest({ farmerName: farmerName.trim(), topic: topic.trim(), expertId, date });
  // Contract `RequestResponse`: { requestId, status }. Internally the row is
  // stored as 'sent'; to a consumer that is a request still awaiting the expert.
  res.status(201).json({ requestId: created.id, status: "Pending" });
};
