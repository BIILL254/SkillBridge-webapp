// server/routes/users.routes.js
import { Router } from "express";
import { getUsers, getUserById, addUser } from "../db.js";

const router = Router();

router.get("/", (req, res) => res.json(getUsers()));

router.get("/:id", (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

router.post("/", (req, res) => {
  const { name, dept, estate, lat, lng, offers, wants } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const newUser = addUser({ name, dept, estate, lat, lng, offers, wants });
  res.status(201).json(newUser);
});

export default router;
