import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CURRENT_RATES_FILE = path.join(__dirname, "../current-rates.json");
const errorLogFile = path.join(__dirname, "../logs/error.log");

function logToFile(filePath, message) {
  fs.appendFile(filePath, message + "\n", err => {
    if (err) console.error(`Failed to write to log file: ${filePath}`, err);
  });
}

export async function buyRateController(req, res) {
  try {
    const data = JSON.parse(fs.readFileSync(CURRENT_RATES_FILE, "utf8"));
    const buyRates = (data.rates || []).filter(r => r.type === "buy").map(r => ({ pair: r.pair, rate: r.rate, type: r.type }));
    res.json({ rates: buyRates });
  } catch (err) {
    const now = new Date().toISOString();
    const origin = req.get('origin') || req.get('referer') || 'unknown';
    const logMsg = `[${now}] ERROR /api/rate/buy | Origin: ${origin} | ${err.message}`;
    console.error(logMsg);
    logToFile(errorLogFile, logMsg);
    res.status(500).json({
      status: 500,
      message: "Failed to read buy rates",
      error: err.message,
      endpoint: "/api/rate/buy",
      time: now,
      origin
    });
  }
}

export async function sellRateController(req, res) {
  try {
    const data = JSON.parse(fs.readFileSync(CURRENT_RATES_FILE, "utf8"));
    const sellRates = (data.rates || []).filter(r => r.type === "sell").map(r => ({ pair: r.pair, rate: r.rate, type: r.type }));
    res.json({ rates: sellRates });
  } catch (err) {
    const now = new Date().toISOString();
    const origin = req.get('origin') || req.get('referer') || 'unknown';
    const logMsg = `[${now}] ERROR /api/rate/sell | Origin: ${origin} | ${err.message}`;
    console.error(logMsg);
    logToFile(errorLogFile, logMsg);
    res.status(500).json({
      status: 500,
      message: "Failed to read sell rates",
      error: err.message,
      endpoint: "/api/rate/sell",
      time: now,
      origin
    });
  }
}
