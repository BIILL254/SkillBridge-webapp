// server/routes/experts.v2.js
//
// Week 13: v2 shape of experts API.
// Wraps lists in { data: [...], count: N } and renames "estate" -> "location".

import { Router } from "express";
import {
  getExperts,
  getExpertById,
  getExpertAvailability,
  getExpertReviews,
} from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// One place that turns a stored expert into the v2 response shape
export const toV2 = (e) => ({
  id: e.id,
  name: e.name,
  location: e.estate, // renamed: was "estate" in v1
  rating: e.rating,
  latitude: e.latitude,
  longitude: e.longitude,
  bio: e.bio,
  skills: e.skills,
});

// GET /api/v2/experts[?location=...][?estate=...][?sort=...]
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { estate, location, sort, lat, lng } = req.query;
    const targetEstate = location || estate;

    if (sort !== undefined && !["rating", "proximity"].includes(sort)) {
      return res.status(400).json({ error: "sort must be 'rating' or 'proximity'" });
    }
    for (const [name, value, limit] of [
      ["lat", lat, 90],
      ["lng", lng, 180],
    ]) {
      if (
        value !== undefined &&
        !(
          value.trim() !== "" &&
          Number.isFinite(Number(value)) &&
          Math.abs(Number(value)) <= limit
        )
      ) {
        return res
          .status(400)
          .json({ error: `${name} must be a number between -${limit} and ${limit}` });
      }
    }
    if (sort === "proximity" && (lat === undefined || lng === undefined)) {
      return res.status(400).json({ error: "lat and lng are required when sort=proximity" });
    }

    const rows = await getExperts({ estate: targetEstate, sort, lat, lng });
    res.json({
      data: rows.map(toV2),
      count: rows.length,
    });
  }),
);

// GET /api/v2/experts/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const expert = await getExpertById(req.params.id);
    if (!expert) return res.status(404).json({ error: "Expert not found" });
    res.json({
      data: toV2(expert),
    });
  }),
);

// GET /api/v2/experts/:id/availability
router.get(
  "/:id/availability",
  asyncHandler(async (req, res) => {
    const availability = await getExpertAvailability(req.params.id);
    if (!availability) return res.status(404).json({ error: "Expert not found" });
    res.json({
      data: availability,
      count: availability.length,
    });
  }),
);

// GET /api/v2/experts/:id/reviews
router.get(
  "/:id/reviews",
  asyncHandler(async (req, res) => {
    const reviews = await getExpertReviews(req.params.id);
    if (!reviews) return res.status(404).json({ error: "Expert not found" });
    res.json({
      data: reviews,
    });
  }),
);

export default router;

