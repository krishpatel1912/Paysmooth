// server/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ridersRouter from "./routes/riders.js";
import simulateRouter from "./routes/simulate.js";
import coachRouter from "./routes/coach.js";
import analyzeRouter from "./routes/analyze.js";
import extractEarningsRouter from "./routes/extractEarnings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

// Load rider data once at startup; routes read it from app.locals
const ridersFile = path.join(__dirname, "..", "data", "riders.json");
app.locals.riders = JSON.parse(readFileSync(ridersFile, "utf-8"));

// API routes
app.use("/api", ridersRouter);
app.use("/api", simulateRouter);
app.use("/api", coachRouter);
app.use("/api", analyzeRouter);
app.use("/api", extractEarningsRouter);

// Unknown API paths
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const HOST = process.env.HOST || "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`PaySmooth API running on http://${HOST}:${PORT}`);
});