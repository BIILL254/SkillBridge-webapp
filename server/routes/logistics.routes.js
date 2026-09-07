// server/routes/logistics.routes.js
//
// The frontend calls these SkillBridge endpoints, and this file calls
// Maji Website on the frontend's behalf. Keeping the external call
// server-side means MAJI_API_KEY (once real) never has to touch the
// browser, and it gives us one place to add caching/retry logic later if
// Maji Website turns out to be slow or flaky.

import { Router } from "express";
import { getStations, getEstates, getPaymentMethods, getDelivery, createDelivery } from "../services/majiClient.js";

const router = Router();

router.get("/stations", async (req, res, next) => {
  try {
    res.json(await getStations(req.query.estate));
  } catch (err) { next(err); }
});

router.get("/estates", async (req, res, next) => {
  try {
    res.json(await getEstates());
  } catch (err) { next(err); }
});

router.get("/payment-methods", async (req, res, next) => {
  try {
    res.json(await getPaymentMethods(req.query.estate));
  } catch (err) { next(err); }
});

router.get("/deliveries/:id", async (req, res, next) => {
  try {
    res.json(await getDelivery(req.params.id));
  } catch (err) { next(err); }
});

router.post("/deliveries", async (req, res, next) => {
  const { stationId, estateAddress, phone, paymentMethod } = req.body;
  if (!stationId || !estateAddress || !phone || !paymentMethod) {
    return res.status(400).json({ error: "stationId, estateAddress, phone, and paymentMethod are required" });
  }
  try {
    res.status(201).json(await createDelivery({ stationId, estateAddress, phone, paymentMethod }));
  } catch (err) { next(err); }
});

export default router;
