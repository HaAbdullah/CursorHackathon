import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import itemsRouter from "./routes/items.js";
import scanRouter from "./routes/scan.js";
import safeScanRouter from "./routes/safeScan.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.get("/health", (req, res) => {
  res.json({ ok: true, fake_llm: false });
});

app.use("/api/items", itemsRouter);
app.use("/api/scan", scanRouter);
app.use("/scan", safeScanRouter);
// exposes POST /api/scan/photo and POST /api/scan/barcode

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
