const axios = require("axios");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Configuration
const API_KEY = "MEP8xDbwpv2310wNbYIVgGHTTFcM3koM";
const CHAIN_ID = 8453; // Base chain
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 45 minutes

// File paths
const CURRENT_RATES_FILE = path.join(__dirname, "current-rates.json");
const HISTORY_FILE = path.join(__dirname, "history.json");

// Token addresses and their details
const TOKENS = {
  // Format: SYMBOL: { address, decimals, amount (in human readable format) }
  BRZ: {
    address: "0xE9185Ee218cae427aF7B9764A011bb89FeA761B4",
    decimals: 18,
    amount: "55595.0", // Amount in human readable format
  },
  CADC: {
    address: "0x043eB4B75d0805c43D7C834902E335621983Cf03",
    decimals: 18,
    amount: "13655.845",
  },
  VCHF: {
    address: "0x1fcA74D9ef54a6AC80ffE7D3b14e76c4330Fd5D8",
    decimals: 18,
    amount: "7692.82",
  },
  EURC: {
    address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
    decimals: 6,
    amount: "8532.521",
  },
  VGBP: {
    address: "0xAEB4bb7DebD1E5e82266f7c3b5cFf56B3A7BF411",
    decimals: 18,
    amount: "7396.122",
  },
  IDRX: {
    address: "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22",
    decimals: 2,
    amount: "163860110.0",
  },
  MXNe: {
    address: "0x269caE7Dc59803e5C596c95756faEeBb6030E0aF",
    decimals: 6,
    amount: "185956.2",
  },
  cNGN: {
    address: "0x46C85152bFe9f96829aA94755D9f915F9B10EF5F",
    decimals: 6,
    amount: "15419119.0",
  },
  TRYB: {
    address: "0xFb8718a69aed7726AFb3f04D2Bd4bfDE1BdCb294",
    decimals: 6,
    amount: "406067.55",
  },
  ZARP: {
    address: "0xb755506531786C8aC63B756BaB1ac387bACB0C04",
    decimals: 18,
    amount: "178764.69",
  },
};

// Pairs to track (USDC/TOKEN)
const PAIRS = Object.keys(TOKENS).map((symbol) => ({
  symbol: `${symbol}/USDC`,
  tokenSymbol: symbol,
  tokenAddress: TOKENS[symbol].address,
  tokenDecimals: TOKENS[symbol].decimals,
  amount: TOKENS[symbol].amount,
}));

// Convert human-readable amount to BigNumber string based on decimals
function toWei(amount, decimals) {
  return ethers.utils.parseUnits(amount.toString(), decimals).toString();
}

// Format exchange rate to 6 decimal places
function formatRate(rate) {
  return parseFloat(rate).toFixed(6);
}

// Fetch quote from 1inch API
async function fetchQuote(srcToken, dstToken, amount, fee = "0.2") {
  const url = `https://api.1inch.dev/swap/v6.0/${CHAIN_ID}/quote`;

  const config = {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    params: {
      src: srcToken,
      dst: dstToken,
      amount: amount,
      fee: fee,
      includeTokensInfo: "true",
    },
    paramsSerializer: {
      indexes: null,
    },
  };

  try {
    const response = await axios.get(url, config);
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching quote for ${srcToken} -> ${dstToken}:`,
      error.message
    );
    return null;
  }
}

// Calculate buy rate (TOKEN/USDC)
async function getBuyRate(pair) {
  const srcAmount = toWei(pair.amount, pair.tokenDecimals);
  const quote = await fetchQuote(
    pair.tokenAddress, // src: token (e.g., BRZ)
    USDC_ADDRESS, // dst: USDC
    srcAmount // amount in wei
  );

  if (!quote) return null;

  // Calculate rate: (token amount) / (USDC amount)
  const tokenAmount = parseFloat(pair.amount);
  const usdcAmount = parseFloat(ethers.utils.formatUnits(quote.dstAmount, 6));
  const rate = tokenAmount / usdcAmount;

  return {
    pair: pair.symbol,
    rate: formatRate(rate),
    timestamp: new Date().toISOString(),
    type: "buy",
    source: "1inch",
    details: {
      tokenAmount: pair.amount,
      usdcAmount: usdcAmount.toString(),
      rawResponse: quote,
    },
  };
}

// Calculate sell rate (USDC/TOKEN)
async function getSellRate(pair) {
  // Using 10,000 USDC (with 6 decimals) as the base amount
  const usdcAmount = "10000000000"; // 10,000 USDC in wei (6 decimals)

  const quote = await fetchQuote(
    USDC_ADDRESS, // src: USDC
    pair.tokenAddress, // dst: token (e.g., BRZ)
    usdcAmount // 10,000 USDC in wei
  );

  if (!quote) return null;

  // Calculate rate: (token amount) / (USDC amount)
  const tokenAmount = parseFloat(
    ethers.utils.formatUnits(quote.dstAmount, pair.tokenDecimals)
  );
  const usdcAmountHuman = parseFloat(ethers.utils.formatUnits(usdcAmount, 6));
  const rate = tokenAmount / usdcAmountHuman;

  return {
    pair: pair.symbol,
    rate: formatRate(rate),
    timestamp: new Date().toISOString(),
    type: "sell",
    source: "1inch",
    details: {
      usdcAmount: usdcAmountHuman.toString(),
      tokenAmount: tokenAmount.toString(),
      rawResponse: quote,
    },
  };
}

// Main function to fetch all rates
async function fetchAllRates() {
  console.log("Fetching exchange rates...");
  const results = [];

  // Process each pair for both buy and sell
  for (const pair of PAIRS) {
    try {
      // console.log(`Fetching rates for ${pair.symbol}...`);

      // Get buy rate (TOKEN/USDC)
      const buyRate = await getBuyRate(pair);
      if (buyRate) {
        results.push(buyRate);
        // console.log(
        //   `  Buy ${pair.symbol}: 1 USDC = ${buyRate.rate} ${pair.tokenSymbol}`
        // );
      }

      // Get sell rate (USDC/TOKEN)
      const sellRate = await getSellRate(pair);
      if (sellRate) {
        results.push(sellRate);
        // console.log(
        //   `  Sell ${pair.symbol}: 1 USDC = ${sellRate.rate} ${pair.tokenSymbol}`
        // );
      }

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing ${pair.symbol}:`, error.message);
    }
  }

  return results;
}

// Save rates to JSON files
function saveRatesToFile(rates) {
  const timestamp = new Date().toISOString();

  // Prepare current rates data
  const currentRates = {
    timestamp,
    rates: rates,
  };

  // Save current rates (overwrite)
  fs.writeFileSync(CURRENT_RATES_FILE, JSON.stringify(currentRates, null, 2));
  // console.log(`\nCurrent rates saved to ${CURRENT_RATES_FILE}`);

  // Prepare history entry
  const historyEntry = {
    timestamp,
    rates: rates.map((rate) => ({
      pair: rate.pair,
      type: rate.type,
      rate: rate.rate,
      source: rate.source,
    })),
  };

  // Load existing history or initialize empty array
  let history = [];
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
      if (Array.isArray(historyData)) {
        history = historyData;
      } else {
        // Handle case where history file exists but doesn't contain an array
        console.warn(
          "History file exists but does not contain valid data. Initializing new history."
        );
      }
    }
  } catch (error) {
    console.error("Error reading history file:", error.message);
  }

  // Add new entry to history
  history.push(historyEntry);

  // Save updated history
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  // console.log(`History updated in ${HISTORY_FILE}`);

  // Print a sample to console
  // console.log("\nSample current rate:", JSON.stringify(rates[0], null, 2));
}

// Initialize data files if they don't exist
function initializeDataFiles() {
  // Create empty current rates file if it doesn't exist
  if (!fs.existsSync(CURRENT_RATES_FILE)) {
    fs.writeFileSync(
      CURRENT_RATES_FILE,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          rates: [],
        },
        null,
        2
      )
    );
  }

  // Create empty history file if it doesn't exist
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, "[]");
  }
}

// Main execution
async function main() {
  try {
    // Initialize data files
    initializeDataFiles();

    // Initial fetch
    console.log("Fetching initial exchange rates...");
    const rates = await fetchAllRates();
    saveRatesToFile(rates);

    // Schedule updates
    console.log(
      `\nNext update in ${Math.floor(UPDATE_INTERVAL_MS / 60000)} minutes...`
    );
    setInterval(async () => {
      try {
        console.log("\n--- Starting scheduled update ---");
        const updatedRates = await fetchAllRates();
        saveRatesToFile(updatedRates);
        console.log(
          `\nNext update in ${Math.floor(
            UPDATE_INTERVAL_MS / 60000
          )} minutes...`
        );
      } catch (error) {
        console.error("Error during scheduled update:", error);
      }
    }, UPDATE_INTERVAL_MS);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  fetchAllRates,
  getBuyRate,
  getSellRate,
  toWei,
  formatRate,
};
