// server/routes/requests.routes.js
import { Router } from "express";
import {
  getRequests,
  getRequestById,
  addRequest,
  updateRequestStatus,
  removeRequest,
  getUserByToken,
  getUserById,
} from "../db.js";
import { consultationHandler } from "./experts.routes.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// GET/PATCH/DELETE are all SkillBridge-internal actions (viewing your
// requests, accepting/declining) — these require a logged-in student.
// Only requests I'm part of — not everyone's.
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  res.json(await getRequests(req.user.id));
}));

// POST is special: it serves TWO different callers with different auth
// needs, distinguished by shape (see below), so it can't use router.use()
// for auth like the other verbs — the consultation branch has to stay
// open since Farmers-AgroConnect has no SkillBridge account to log in with.
router.post("/", asyncHandler(async (req, res) => {
  // Farmers-AgroConnect's consultation-booking shape (see
  // API_NEEDS_DOWNSTREAM.md Needs Statement 4) is distinguished by having
  // an expertId field, which SkillBridge's own swap/coin requests never do.
  // Deliberately NOT behind requireAuth — AgroConnect is an external
  // partner service, not a logged-in SkillBridge student.
  // Any of the consultation-only fields marks it as AgroConnect's shape (so a
  // booking that forgot expertId gets a helpful 400, not a confusing 401).
  const isConsultation = ["expertId", "farmerName", "topic"].some((k) => req.body[k] !== undefined);
  if (isConsultation) {
    return consultationHandler(req, res);
  }

  // Everything else is a SkillBridge student creating a swap/coin request,
  // which does require login — fromId is taken from the verified token,
  // never trusted from the request body, so nobody can spoof sending a
  // request "as" someone else.
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const user = token ? await getUserByToken(token) : null;
  if (!user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { toId, offer, want, type, msg, vendorId, vendorName } = req.body;

  if (!msg || !want || !type) {
    return res.status(400).json({ error: "msg, want, and type are required" });
  }
  if (typeof msg !== "string" || !msg.trim() || typeof want !== "string" || !want.trim()) {
    return res.status(400).json({ error: "msg and want must be non-empty strings" });
  }
  if (offer !== undefined && offer !== null && typeof offer !== "string") {
    return res.status(400).json({ error: "offer must be a string" });
  }
  if (!["swap", "coin"].includes(type)) {
    return res.status(400).json({ error: "type must be 'swap' or 'coin' (use expertId for a consultation booking)" });
  }
  // A request can go to a SkillBridge user (toId) or to a Maji vendor
  // (vendorId + vendorName), never both. Vendors have no SkillBridge account.
  const isVendorRequest = vendorId !== undefined && vendorId !== null;
  if (isVendorRequest) {
    if (toId !== undefined && toId !== null) {
      return res.status(400).json({ error: "Send either toId (a SkillBridge user) or vendorId (a Maji vendor), not both" });
    }
    if (!Number.isInteger(vendorId) || vendorId < 1) {
      return res.status(400).json({ error: "vendorId must be a positive integer" });
    }
    if (typeof vendorName !== "string" || !vendorName.trim() || vendorName.length > 120) {
      return res.status(400).json({ error: "vendorName is required (a non-empty string of at most 120 characters)" });
    }
  } else if (toId !== undefined && toId !== null && !(await getUserById(toId))) {
    return res.status(400).json({ error: "toId does not match any SkillBridge user" });
  }

  const newRequest = await addRequest({
    fromId: user.id, toId, offer, want, type, msg,
    ...(isVendorRequest ? { vendorId, vendorName: vendorName.trim() } : {}),
  });
  res.status(201).json(newRequest);
}));

const VALID_STATUSES = ["sent", "incoming", "accepted", "declined"];

// Loads a request and checks it exists (404) and that the caller is part of it (403).
// Returns the request, or null after having already sent the error response.
async function loadMyRequest(req, res) {
  const existing = await getRequestById(Number(req.params.id));
  if (!existing) {
    res.status(404).json({ error: "Request not found" });
    return null;
  }
  if (existing.fromId !== req.user.id && existing.toId !== req.user.id) {
    res.status(403).json({ error: "You can only change requests you are part of" });
    return null;
  }
  return existing;
}

router.patch("/:id", requireAuth, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "status is required" });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const existing = await loadMyRequest(req, res);
  if (!existing) return;

  res.json(await updateRequestStatus(existing.id, status));
}));

router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const existing = await loadMyRequest(req, res);
  if (!existing) return;

  await removeRequest(existing.id);
  res.status(204).end();
}));

export default router;
