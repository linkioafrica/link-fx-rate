import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import rateRoutes from './routes/rate.js';
import dotenv from "dotenv";
import { createRequire } from "module";

dotenv.config();

// import { corsOptions } from "./configs/corsOptions.js";

// Start the exchange rate fetcher from the CommonJS module
const require = createRequire(import.meta.url);
const exchangeRates = require("./exchange-rates.cjs");
if (exchangeRates && typeof exchangeRates.main === "function") {
  exchangeRates.main();
}

const app = express();
// app.use(cors(corsOptions));
app.use(express.urlencoded({ limit: "30mb", extended: false }));
app.use(express.json({ limit: "30mb", extended: true }));
app.use(cookieParser());

import fs from "fs";
import path from "path";

const logDir = path.resolve("./logs");
const accessLogFile = path.join(logDir, "access.log");
const errorLogFile = path.join(logDir, "error.log");

function logToFile(filePath, message) {
  fs.appendFile(filePath, message + "\n", err => {
    if (err) console.error(`Failed to write to log file: ${filePath}`, err);
  });
}

// Logging middleware
app.use((req, res, next) => {
  const now = new Date().toISOString();
  const origin = req.get('origin') || req.get('referer') || 'unknown';
  const logMsg = `[${now}] Endpoint: ${req.method} ${req.originalUrl} | Origin: ${origin}`;
  console.log(logMsg);
  logToFile(accessLogFile, logMsg);
  next();
});

app.get("/", (req, res) =>
  res.json({
    status: 200,
    message: "Welcome to LINK FX Rate API",
  })
);

// Mount rate endpoints
app.use('/api/rate', rateRoutes);

const PORT = process.env.PORT || 4800;



app.listen(PORT, () => {
  console.log(`FX Rate API server running on port ${PORT}`);
});
