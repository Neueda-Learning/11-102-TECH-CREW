const INVESTMENT_USER_ID = 1;
const INVESTMENT_PORTFOLIO_ID = 1;
const DISPLAY_CURRENCY = "INR";
const DEFAULT_USD_INR_RATE = 83;

const API_BASE_CANDIDATES = buildApiBaseCandidates();
const ALPHA_VANTAGE_SEARCH_URL = "https://www.alphavantage.co/query";

const predefinedSymbolsByAsset = {
  BOND: [
    { symbol: "US10Y", name: "US Treasury 10Y" },
    { symbol: "CORP2029", name: "Corporate Bond 2029" },
    { symbol: "MUNI2031", name: "Municipal Bond 2031" }
  ],
  COMMODITY: [
    { symbol: "XAUUSD", name: "Gold Spot" },
    { symbol: "XAGUSD", name: "Silver Spot" },
    { symbol: "XPTUSD", name: "Platinum Spot" },
    { symbol: "BRENT", name: "Brent Crude" }
  ]
};

let holdingsCache = [];
let transactionsCache = [];
let selectedBuySuggestion = null;
let selectedSellHolding = null;
let usdInrRate = DEFAULT_USD_INR_RATE;
let buySearchToken = 0;

const buyRefs = {
  assetType: null,
  symbolInput: null,
  suggestions: null,
  container: null
};

const sellRefs = {
  assetType: null,
  symbolInput: null,
  suggestions: null,
  container: null,
  quantityInput: null,
  availableInput: null,
  avgPriceInput: null
};

document.addEventListener("DOMContentLoaded", async function () {
  setDefaultDates();
  cacheElements();
  initializeBuySymbolSearch();
  initializeSellOwnedAssetSearch();
  bindForms();

  await refreshPageData();
  applyInvestmentUrlParams();
});

function cacheElements() {
  buyRefs.assetType = document.getElementById("buyAssetType");
  buyRefs.symbolInput = document.getElementById("buySymbol");
  buyRefs.suggestions = document.getElementById("buySymbolSuggestions");
  buyRefs.container = document.getElementById("buySymbolSearchContainer");

  sellRefs.assetType = document.getElementById("sellAssetType");
  sellRefs.symbolInput = document.getElementById("sellSymbol");
  sellRefs.suggestions = document.getElementById("sellSymbolSuggestions");
  sellRefs.container = document.getElementById("sellSymbolSearchContainer");
  sellRefs.quantityInput = document.getElementById("sellQuantity");
  sellRefs.availableInput = document.getElementById("sellAvailableQuantity");
  sellRefs.avgPriceInput = document.getElementById("sellAverageBuyPrice");
}

async function refreshPageData() {
  try {
    const [investments, transactions, rate] = await Promise.all([
      fetchInvestments(),
      fetchTransactions(),
      fetchUsdInrRate()
    ]);

    holdingsCache = normalizeHoldings(investments);
    transactionsCache = normalizeTransactions(transactions);
    usdInrRate = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_INR_RATE;

    renderTransactions();
  } catch (error) {
    console.error("[Investment] Failed to refresh data:", error);
    showStatus("buyStatus", "Unable to load latest holdings/transactions from backend.", "error");
    renderTransactions();
  }
}

function setDefaultDates() {
  const today = new Date().toISOString().split("T")[0];
  const buyDate = document.getElementById("buyDate");
  const sellDate = document.getElementById("sellDate");

  if (buyDate) {
    buyDate.value = today;
  }
  if (sellDate) {
    sellDate.value = today;
  }
}

function bindForms() {
  const buyForm = document.getElementById("buyForm");
  const sellForm = document.getElementById("sellForm");

  if (buyForm) {
    buyForm.addEventListener("submit", handleBuySubmit);
  }
  if (sellForm) {
    sellForm.addEventListener("submit", handleSellSubmit);
  }
}

async function handleBuySubmit(event) {
  event.preventDefault();
  clearStatus("buyStatus");
  clearStatus("sellStatus");

  try {
    const formData = new FormData(event.currentTarget);
    const assetType = normalizeAssetType(formData.get("assetType"));
    const symbolInput = String(formData.get("symbol") || "").trim().toUpperCase();
    const quantity = parseInt(String(formData.get("quantity") || "0"), 10);
    const buyPrice = toNumber(formData.get("buyPrice"));
    const currentPrice = toNumber(formData.get("currentPrice"));

    validateRequiredAssetType(assetType);

    if (!selectedBuySuggestion || selectedBuySuggestion.assetType !== assetType || selectedBuySuggestion.symbol !== symbolInput) {
      throw new Error("Please select a valid symbol from the suggestion list.");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }
    if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
      throw new Error("Buy price must be greater than zero.");
    }
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      throw new Error("Current price must be greater than zero.");
    }

    const payload = {
      symbol: selectedBuySuggestion.symbol,
      assetType: assetType,
      transactionType: "BUY",
      quantity: quantity,
      price: buyPrice
    };

    await postJson("/transactions/" + INVESTMENT_PORTFOLIO_ID, payload);

    showStatus("buyStatus", "Buy trade recorded successfully.", "success");
    event.currentTarget.reset();
    selectedBuySuggestion = null;
    hideSuggestions(buyRefs.suggestions);
    setDefaultDates();

    await refreshPageData();
    refreshSellSelectionFromSymbol();
  } catch (error) {
    showStatus("buyStatus", extractErrorMessage(error), "error");
  }
}

async function handleSellSubmit(event) {
  event.preventDefault();
  clearStatus("buyStatus");
  clearStatus("sellStatus");

  try {
    const formData = new FormData(event.currentTarget);
    const assetType = normalizeAssetType(formData.get("assetType"));
    const symbolInput = String(formData.get("symbol") || "").trim().toUpperCase();
    const quantity = parseInt(String(formData.get("quantity") || "0"), 10);
    const sellPrice = toNumber(formData.get("sellPrice"));

    validateRequiredAssetType(assetType);

    if (!selectedSellHolding || selectedSellHolding.assetType !== assetType || selectedSellHolding.symbol !== symbolInput) {
      throw new Error("Please select an owned symbol from the suggestion list.");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
      throw new Error("Sell price must be greater than zero.");
    }
    if (quantity > selectedSellHolding.quantity) {
      throw new Error("Sell quantity cannot exceed current holding (" + selectedSellHolding.quantity + ").");
    }

    const payload = {
      symbol: selectedSellHolding.symbol,
      assetType: selectedSellHolding.assetType,
      transactionType: "SELL",
      quantity: quantity,
      price: sellPrice
    };

    await postJson("/transactions/" + INVESTMENT_PORTFOLIO_ID, payload);

    showStatus("sellStatus", "Sell trade recorded successfully.", "success");
    event.currentTarget.reset();
    clearSellSelection();
    hideSuggestions(sellRefs.suggestions);
    setDefaultDates();

    await refreshPageData();
  } catch (error) {
    showStatus("sellStatus", extractErrorMessage(error), "error");
  }
}

function initializeBuySymbolSearch() {
  if (!buyRefs.assetType || !buyRefs.symbolInput || !buyRefs.suggestions || !buyRefs.container) {
    return;
  }

  buyRefs.assetType.addEventListener("change", function () {
    selectedBuySuggestion = null;
    buyRefs.symbolInput.value = "";
    buyRefs.symbolInput.placeholder = buyRefs.assetType.value === "STOCK"
      ? "Search symbol or company name"
      : "Select from suggestions";
    hideSuggestions(buyRefs.suggestions);
  });

  buyRefs.symbolInput.addEventListener("input", async function () {
    selectedBuySuggestion = null;
    const query = String(buyRefs.symbolInput.value || "").trim();
    if (query.length < 1) {
      hideSuggestions(buyRefs.suggestions);
      return;
    }

    const assetType = normalizeAssetType(buyRefs.assetType.value);
    if (!assetType) {
      hideSuggestions(buyRefs.suggestions);
      return;
    }

    if (assetType === "STOCK") {
      await renderStockSuggestions(query);
      return;
    }

    renderStaticAssetSuggestions(assetType, query);
  });

  buyRefs.symbolInput.addEventListener("focus", function () {
    const query = String(buyRefs.symbolInput.value || "").trim();
    if (query.length > 0) {
      buyRefs.symbolInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  buyRefs.symbolInput.addEventListener("blur", function () {
    setTimeout(function () { hideSuggestions(buyRefs.suggestions); }, 120);
  });

  buyRefs.suggestions.addEventListener("mousedown", function (event) {
    const item = event.target.closest(".symbol-suggestion-item");
    if (!item) {
      return;
    }

    event.preventDefault();
    const symbol = String(item.getAttribute("data-symbol") || "").trim().toUpperCase();
    const assetType = normalizeAssetType(buyRefs.assetType.value);
    if (!symbol || !assetType) {
      return;
    }

    selectedBuySuggestion = {
      symbol: symbol,
      assetType: assetType
    };
    buyRefs.symbolInput.value = symbol;
    hideSuggestions(buyRefs.suggestions);
  });

  document.addEventListener("click", function (event) {
    if (!buyRefs.container.contains(event.target)) {
      hideSuggestions(buyRefs.suggestions);
    }
  });
}

async function renderStockSuggestions(query) {
  const token = ++buySearchToken;
  buyRefs.suggestions.innerHTML = '<div class="symbol-suggestion-empty">Searching tickers...</div>';
  buyRefs.suggestions.classList.remove("hidden");

  try {
    const symbols = await fetchStockSearchSuggestions(query);
    if (token !== buySearchToken) {
      return;
    }

    if (!symbols.length) {
      buyRefs.suggestions.innerHTML = '<div class="symbol-suggestion-empty">No matching ticker found</div>';
      buyRefs.suggestions.classList.remove("hidden");
      return;
    }

    buyRefs.suggestions.innerHTML = symbols.map(function (item) {
      return '<button type="button" class="symbol-suggestion-item" data-symbol="' + item.symbol + '"><strong>' +
        item.symbol + '</strong><span>- ' + item.name + '</span></button>';
    }).join("");
    buyRefs.suggestions.classList.remove("hidden");
  } catch (error) {
    buyRefs.suggestions.innerHTML = '<div class="symbol-suggestion-empty">Live search unavailable. Try again.</div>';
    buyRefs.suggestions.classList.remove("hidden");
  }
}

function renderStaticAssetSuggestions(assetType, query) {
  const source = predefinedSymbolsByAsset[assetType] || [];
  const lowered = query.toLowerCase();

  const matches = source.filter(function (item) {
    return item.symbol.toLowerCase().indexOf(lowered) !== -1 || item.name.toLowerCase().indexOf(lowered) !== -1;
  });

  if (!matches.length) {
    buyRefs.suggestions.innerHTML = '<div class="symbol-suggestion-empty">No matching symbol found</div>';
    buyRefs.suggestions.classList.remove("hidden");
    return;
  }

  buyRefs.suggestions.innerHTML = matches.map(function (item) {
    return '<button type="button" class="symbol-suggestion-item" data-symbol="' + item.symbol + '"><strong>' +
      item.symbol + '</strong><span>- ' + item.name + '</span></button>';
  }).join("");
  buyRefs.suggestions.classList.remove("hidden");
}

async function fetchStockSearchSuggestions(query) {
  const apiKey = getAlphaVantageSearchApiKey();
  if (!apiKey || isDemoApiKey(apiKey)) {
    return [];
  }

  const requestUrl =
    ALPHA_VANTAGE_SEARCH_URL +
    "?function=SYMBOL_SEARCH&keywords=" + encodeURIComponent(query) +
    "&apikey=" + encodeURIComponent(apiKey);

  let response;
  try {
    response = await fetch(requestUrl);
  } catch (error) {
    response = null;
  }

  if (!response || !response.ok) {
    const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(requestUrl);
    response = await fetch(proxyUrl);
  }

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const raw = Array.isArray(payload.bestMatches) ? payload.bestMatches : [];

  return raw.slice(0, 8).map(function (item) {
    return {
      symbol: String(item["1. symbol"] || "").trim().toUpperCase(),
      name: String(item["2. name"] || "").trim()
    };
  }).filter(function (item) {
    return item.symbol;
  });
}

function initializeSellOwnedAssetSearch() {
  if (!sellRefs.assetType || !sellRefs.symbolInput || !sellRefs.suggestions || !sellRefs.container) {
    return;
  }

  sellRefs.assetType.addEventListener("change", function () {
    clearSellSelection();
    sellRefs.symbolInput.value = "";
    hideSuggestions(sellRefs.suggestions);
  });

  sellRefs.symbolInput.addEventListener("input", function () {
    selectedSellHolding = null;
    const query = String(sellRefs.symbolInput.value || "").trim();
    if (!query) {
      clearSellAutoFill();
      hideSuggestions(sellRefs.suggestions);
      return;
    }

    renderSellSuggestions(query);
  });

  sellRefs.symbolInput.addEventListener("focus", function () {
    const query = String(sellRefs.symbolInput.value || "").trim();
    if (query) {
      renderSellSuggestions(query);
    }
  });

  sellRefs.symbolInput.addEventListener("blur", function () {
    setTimeout(function () { hideSuggestions(sellRefs.suggestions); }, 120);
  });

  sellRefs.suggestions.addEventListener("mousedown", function (event) {
    const item = event.target.closest(".symbol-suggestion-item");
    if (!item) {
      return;
    }

    event.preventDefault();
    const symbol = String(item.getAttribute("data-symbol") || "").trim().toUpperCase();
    const assetType = normalizeAssetType(sellRefs.assetType.value);

    const match = holdingsCache.find(function (holding) {
      return holding.symbol === symbol && holding.assetType === assetType;
    });
    if (!match) {
      return;
    }

    selectedSellHolding = match;
    sellRefs.symbolInput.value = match.symbol;
    applySellAutoFill(match);
    hideSuggestions(sellRefs.suggestions);
  });

  sellRefs.quantityInput.addEventListener("input", function () {
    const max = Number(sellRefs.quantityInput.max || 0);
    const current = Number(sellRefs.quantityInput.value || 0);
    if (max > 0 && current > max) {
      sellRefs.quantityInput.value = String(max);
    }
  });

  document.addEventListener("click", function (event) {
    if (!sellRefs.container.contains(event.target)) {
      hideSuggestions(sellRefs.suggestions);
    }
  });
}

function renderSellSuggestions(query) {
  const assetType = normalizeAssetType(sellRefs.assetType.value);
  if (!assetType) {
    hideSuggestions(sellRefs.suggestions);
    return;
  }

  const lowered = query.toLowerCase();
  const matches = holdingsCache.filter(function (holding) {
    return holding.assetType === assetType && holding.quantity > 0 && holding.symbol.toLowerCase().indexOf(lowered) !== -1;
  });

  if (!matches.length) {
    sellRefs.suggestions.innerHTML = '<div class="symbol-suggestion-empty">No matching owned assets found</div>';
    sellRefs.suggestions.classList.remove("hidden");
    return;
  }

  sellRefs.suggestions.innerHTML = matches.slice(0, 10).map(function (holding) {
    return '<button type="button" class="symbol-suggestion-item" data-symbol="' + holding.symbol + '"><strong>' +
      holding.symbol + '</strong><span>- ' + getAssetLabel(holding.assetType) + '</span><span class="owned-badge">' +
      Math.floor(holding.quantity) + ' Shares Owned</span></button>';
  }).join("");
  sellRefs.suggestions.classList.remove("hidden");
}

function applySellAutoFill(holding) {
  if (!sellRefs.availableInput || !sellRefs.avgPriceInput || !sellRefs.quantityInput) {
    return;
  }

  sellRefs.availableInput.value = formatNumber(holding.quantity);
  sellRefs.avgPriceInput.value = formatCurrency(convertUsdToInr(holding.purchasePrice));
  sellRefs.quantityInput.max = String(Math.floor(holding.quantity));
}

function clearSellAutoFill() {
  if (sellRefs.availableInput) {
    sellRefs.availableInput.value = "";
  }
  if (sellRefs.avgPriceInput) {
    sellRefs.avgPriceInput.value = "";
  }
  if (sellRefs.quantityInput) {
    sellRefs.quantityInput.removeAttribute("max");
  }
}

function clearSellSelection() {
  selectedSellHolding = null;
  clearSellAutoFill();
}

function refreshSellSelectionFromSymbol() {
  if (!sellRefs.symbolInput || !sellRefs.assetType) {
    return;
  }

  const symbol = String(sellRefs.symbolInput.value || "").trim().toUpperCase();
  const assetType = normalizeAssetType(sellRefs.assetType.value);
  if (!symbol || !assetType) {
    clearSellSelection();
    return;
  }

  const match = holdingsCache.find(function (holding) {
    return holding.symbol === symbol && holding.assetType === assetType;
  });

  if (!match) {
    clearSellSelection();
    return;
  }

  selectedSellHolding = match;
  applySellAutoFill(match);
}

function renderTransactions() {
  const body = document.getElementById("investmentTransactionsBody");
  if (!body) {
    return;
  }

  body.innerHTML = "";
  if (!transactionsCache.length) {
    body.innerHTML = '<tr><td colspan="6">No transactions recorded yet.</td></tr>';
    return;
  }

  transactionsCache.slice(0, 10).forEach(function (tx) {
    body.innerHTML +=
      "<tr>" +
      "<td>" + tx.dateLabel + "</td>" +
      "<td>" + tx.action + "</td>" +
      "<td>" + tx.symbol + "</td>" +
      "<td>" + tx.assetLabel + "</td>" +
      "<td>" + formatNumber(tx.quantity) + "</td>" +
      "<td>" + formatCurrency(convertUsdToInr(tx.price)) + "</td>" +
      "</tr>";
  });
}

function normalizeHoldings(payload) {
  return normalizeArrayPayload(payload).map(function (row) {
    return {
      id: row.id,
      symbol: String(row.symbol || "").trim().toUpperCase(),
      assetType: normalizeAssetType(row.assetType),
      quantity: toNumber(row.quantity),
      purchasePrice: toNumber(row.purchasePrice)
    };
  }).filter(function (row) {
    return row.symbol && row.assetType && Number.isFinite(row.quantity) && row.quantity > 0;
  });
}

function normalizeTransactions(payload) {
  return normalizeArrayPayload(payload).map(function (row) {
    const date = parseDate(row.transactionDate);
    return {
      symbol: String(row.symbol || "").trim().toUpperCase(),
      assetType: normalizeAssetType(row.assetType),
      assetLabel: getAssetLabel(row.assetType),
      action: String(row.transactionType || "").trim().toUpperCase(),
      quantity: toNumber(row.quantity),
      price: toNumber(row.price),
      sortDate: date,
      dateLabel: formatDateTime(date)
    };
  }).sort(function (a, b) {
    return b.sortDate.getTime() - a.sortDate.getTime();
  });
}

function parseDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0);
  }
  return parsed;
}

function formatDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function validateRequiredAssetType(assetType) {
  if (!assetType || ["STOCK", "BOND", "COMMODITY"].indexOf(assetType) === -1) {
    throw new Error("Please select a valid asset type.");
  }
}

function normalizeAssetType(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "STOCKS") {
    return "STOCK";
  }
  if (raw === "BONDS") {
    return "BOND";
  }
  if (raw === "COMMODITIES") {
    return "COMMODITY";
  }
  return raw;
}

function getAssetLabel(assetType) {
  const key = normalizeAssetType(assetType);
  if (key === "STOCK") {
    return "Stock";
  }
  if (key === "BOND") {
    return "Bond";
  }
  if (key === "COMMODITY") {
    return "Commodity";
  }
  return key || "Asset";
}

function hideSuggestions(suggestionBox) {
  if (suggestionBox) {
    suggestionBox.classList.add("hidden");
  }
}

function showStatus(id, message, type) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = "status-message " + (type === "success" ? "status-success" : "status-error");
}

function clearStatus(id) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.textContent = "";
  element.className = "status-message hidden";
}

function extractErrorMessage(error) {
  if (!error) {
    return "Request failed.";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error.message) {
    return error.message;
  }
  return "Request failed.";
}

function getAlphaVantageSearchApiKey() {
  return (
    window.ALPHA_VANTAGE_SEARCH_API_KEY ||
    localStorage.getItem("alphaVantageSearchApiKey") ||
    ""
  );
}

function isDemoApiKey(apiKey) {
  return String(apiKey || "").trim().toLowerCase() === "demo";
}

async function fetchUsdInrRate() {
  const url = String(window.USD_INR_API_URL || "https://open.er-api.com/v6/latest/USD").trim();
  if (!url) {
    return DEFAULT_USD_INR_RATE;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error("FX API HTTP " + response.status);
    }

    const payload = await response.json();
    const rate = firstValidNumber([
      payload && payload.rates ? payload.rates.INR : null,
      payload && payload.conversion_rates ? payload.conversion_rates.INR : null
    ]);
    if (Number.isFinite(rate) && rate > 0) {
      return rate;
    }
  } catch (error) {
    console.warn("[Investment] USD-INR API unavailable, using fallback rate", DEFAULT_USD_INR_RATE, error);
  }

  return DEFAULT_USD_INR_RATE;
}

function convertUsdToInr(amount) {
  const numeric = toNumber(amount);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return numeric * usdInrRate;
}

function formatCurrency(amount) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sign = safeAmount < 0 ? "-" : "";
  const absolute = Math.abs(safeAmount);

  if (absolute >= 10000000) {
    return sign + "\u20b9" + (absolute / 10000000).toFixed(2).replace(/\.00$/, "") + "Cr";
  }
  if (absolute >= 100000) {
    return sign + "\u20b9" + (absolute / 100000).toFixed(2).replace(/\.00$/, "") + "L";
  }
  if (absolute >= 1000) {
    return sign + "\u20b9" + (absolute / 1000).toFixed(2).replace(/\.00$/, "") + "K";
  }

  return sign + "\u20b9" + absolute.toFixed(2);
}

function formatNumber(value) {
  const numeric = toNumber(value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(safe);
}

function convertToInr(amount, currency, usdInrRateValue) {
  const numeric = toNumber(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  const code = String(currency || "USD").trim().toUpperCase();
  if (code === "INR") {
    return numeric;
  }
  return numeric * usdInrRateValue;
}

async function fetchInvestments() {
  const paths = [
    "/investments/portfolio/" + INVESTMENT_PORTFOLIO_ID,
    "/investments/user/" + INVESTMENT_USER_ID
  ];

  let lastError = null;
  for (let i = 0; i < paths.length; i += 1) {
    try {
      const payload = await fetchJson(paths[i]);
      const rows = normalizeArrayPayload(payload);
      if (Array.isArray(rows)) {
        return rows;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return [];
}

async function fetchQuote(symbol) {
  if (!symbol) {
    return null;
  }

  try {
    return await fetchJson("/market/quote/" + encodeURIComponent(symbol));
  } catch (error) {
    return null;
  }
}

function parsePriceFromQuote(quote) {
  if (!quote || typeof quote !== "object") {
    return NaN;
  }
  return firstValidNumber([
    quote["05. price"],
    quote["4. close"],
    quote["close"],
    quote["price"],
    quote["c"]
  ]);
}

function parseCurrency(quote) {
  if (!quote || typeof quote !== "object") {
    return "";
  }
  const raw = String(quote.currency || "").trim().toUpperCase();
  return raw.length >= 3 ? raw.substring(0, 3) : "";
}

function firstValidNumber(values) {
  for (let i = 0; i < values.length; i += 1) {
    const numeric = toNumber(values[i]);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return NaN;
}

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }
  const cleaned = String(value == null ? "" : value).replace(/[^0-9.-]/g, "");
  const numeric = Number.parseFloat(cleaned);
  return Number.isFinite(numeric) ? numeric : NaN;
}

async function fetchTransactions() {
  return await fetchJson("/transactions/" + INVESTMENT_PORTFOLIO_ID);
}

async function postJson(path, payload) {
  let lastError = null;

  for (let i = 0; i < API_BASE_CANDIDATES.length; i += 1) {
    const baseUrl = API_BASE_CANDIDATES[i];
    const url = baseUrl ? baseUrl + path : path;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await tryReadErrorMessage(response);
        lastError = new Error(message || ("HTTP " + response.status + " from " + url));
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to post " + path);
}

async function fetchJson(path) {
  let lastError = null;

  for (let i = 0; i < API_BASE_CANDIDATES.length; i += 1) {
    const baseUrl = API_BASE_CANDIDATES[i];
    const url = baseUrl ? baseUrl + path : path;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        lastError = new Error("HTTP " + response.status + " from " + url);
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to fetch " + path);
}

async function tryReadErrorMessage(response) {
  try {
    const text = await response.text();
    return text ? text.replace(/^"|"$/g, "") : "";
  } catch (error) {
    return "";
  }
}

function normalizeArrayPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.value)) {
    return payload.value;
  }
  return [];
}

function applyInvestmentUrlParams() {
  const params = new URLSearchParams(window.location.search || "");
  const symbol = String(params.get("symbol") || "").trim().toUpperCase();
  const action = String(params.get("action") || "").trim().toLowerCase();
  const type = normalizeAssetType(params.get("type"));

  if (!symbol || (action !== "buy" && action !== "sell")) {
    return;
  }

  if (action === "buy") {
    if (buyRefs.assetType && type) {
      buyRefs.assetType.value = type;
    }
    if (buyRefs.symbolInput) {
      buyRefs.symbolInput.value = symbol;
      buyRefs.symbolInput.dispatchEvent(new Event("input", { bubbles: true }));
      buyRefs.symbolInput.focus();
    }

    const buyForm = document.getElementById("buyForm");
    if (buyForm) {
      buyForm.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  if (sellRefs.assetType && type) {
    sellRefs.assetType.value = type;
  }
  if (sellRefs.symbolInput) {
    sellRefs.symbolInput.value = symbol;
    sellRefs.symbolInput.dispatchEvent(new Event("input", { bubbles: true }));
    sellRefs.symbolInput.focus();
  }

  const sellForm = document.getElementById("sellForm");
  if (sellForm) {
    sellForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function buildApiBaseCandidates() {
  const candidates = [];
  const configured = String(window.INVESTIQ_API_BASE_URL || "").trim();
  if (configured) {
    candidates.push(stripTrailingSlash(configured));
  }

  if (window.location && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
    candidates.push(stripTrailingSlash(window.location.origin));
  }

  candidates.push("http://localhost:8083");
  candidates.push("http://localhost:8082");

  const unique = [];
  candidates.forEach(function (item) {
    if (item && unique.indexOf(item) === -1) {
      unique.push(item);
    }
  });
  return unique;
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}
