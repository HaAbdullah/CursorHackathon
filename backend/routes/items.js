import { Router } from "express";
import db from "../src/db.js";

const router = Router();

router.get("/", (req, res) => {
  const items = db.prepare("SELECT * FROM items ORDER BY id DESC").all();
  res.json(items);
});

router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const result = db.prepare("INSERT INTO items (name) VALUES (?)").run(name);
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(item);
});

export default router;
