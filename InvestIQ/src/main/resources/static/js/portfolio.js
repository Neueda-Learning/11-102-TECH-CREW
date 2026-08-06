const PORTFOLIO_USER_ID = 1;
const PORTFOLIO_ID = 1;
const DISPLAY_CURRENCY = "INR";
const DEFAULT_USD_INR_RATE = 83;
const API_BASE_CANDIDATES = buildApiBaseCandidates();

let holdingOverviewChartInstance = null;
let selectedHolding = null;
let holdingsCache = [];
let transactionsCache = [];

document.addEventListener("DOMContentLoaded", function () {
  initializeHoldingOverviewDrawer();
  loadPortfolioPageData();
});

async function loadPortfolioPageData() {
  setLoadingState();

  try {
    const usdInrRate = await fetchUsdInrRate();
    const [investments, transactions] = await Promise.all([
      fetchInvestments(),
      fetchTransactions()
    ]);

    holdingsCache = await buildHoldings(investments, usdInrRate);
    transactionsCache = normalizeTransactions(transactions, holdingsCache, usdInrRate);

    renderPortfolioSummary(holdingsCache);
    renderHoldingsTable(holdingsCache);
    renderTransactionsTable(transactionsCache);
  } catch (error) {
    console.error("[Portfolio] Failed to load page data:", error);
    renderEmptyState("Unable to load portfolio data from backend.");
  }
}

async function fetchInvestments() {
  const paths = [
    "/investments/portfolio/" + PORTFOLIO_ID,
    "/investments/user/" + PORTFOLIO_USER_ID
  ];

  let lastError = null;
  for (let i = 0; i < paths.length; i += 1) {
    try {
      const payload = await fetchJson(paths[i]);
      const list = normalizeArrayPayload(payload);
      if (Array.isArray(list) && list.length) {
        return list;
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

async function fetchTransactions() {
  const payload = await fetchJson("/transactions/" + PORTFOLIO_ID);
  return normalizeArrayPayload(payload);
}

async function buildHoldings(investments, usdInrRate) {
  const tasks = (Array.isArray(investments) ? investments : []).map(async function (investment) {
    const symbol = String(investment.symbol || "").trim().toUpperCase();
    const quantity = toNumber(investment.quantity);
    const buyPrice = toNumber(investment.purchasePrice);

    if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(buyPrice) || buyPrice <= 0) {
      return null;
    }

    const quote = await fetchQuote(symbol);
    const currentPriceRaw = quote ? parsePriceFromQuote(quote) : NaN;
    const sourceCurrency = parseCurrency(quote) || "USD";
    const safeCurrentPriceRaw = Number.isFinite(currentPriceRaw) && currentPriceRaw > 0 ? currentPriceRaw : buyPrice;

    const buyPriceInr = convertToInr(buyPrice, sourceCurrency, usdInrRate);
    const currentPriceInr = convertToInr(safeCurrentPriceRaw, sourceCurrency, usdInrRate);
    const invested = quantity * buyPriceInr;
    const currentValue = quantity * currentPriceInr;

    return {
      symbol: symbol,
      assetType: String(investment.assetType || "").toUpperCase(),
      assetLabel: getAssetLabel(investment.assetType),
      quantity: quantity,
      buyPrice: buyPriceInr,
      currentPrice: currentPriceInr,
      currentValue: currentValue,
      invested: invested,
      profit: currentValue - invested,
      sourceCurrency: sourceCurrency,
      currency: DISPLAY_CURRENCY
    };
  });

  const settled = await Promise.allSettled(tasks);
  const holdings = [];
  settled.forEach(function (item) {
    if (item.status === "fulfilled" && item.value) {
      holdings.push(item.value);
    }
  });
  return holdings;
}

function renderPortfolioSummary(holdings) {
  const totalInvested = holdings.reduce(function (sum, row) { return sum + row.invested; }, 0);
  const totalCurrent = holdings.reduce(function (sum, row) { return sum + row.currentValue; }, 0);
  const totalProfit = totalCurrent - totalInvested;

  setText("portfolioInvested", formatCurrency(totalInvested));
  setText("portfolioCurrent", formatCurrency(totalCurrent));
  setText("portfolioProfit", formatCurrency(totalProfit));
  setText("portfolioAssets", formatNumber(holdings.length));

  const profitElement = document.getElementById("portfolioProfit");
  if (profitElement) {
    profitElement.classList.remove("profit-positive", "profit-negative", "profit-neutral");
    profitElement.classList.add(getProfitClass(totalProfit));
  }
}

function renderHoldingsTable(holdings) {
  const body = document.getElementById("portfolioHoldingsBody");
  if (!body) {
    return;
  }

  body.innerHTML = "";
  if (!holdings.length) {
    body.innerHTML = '<tr><td colspan="7">No holdings available for user 1 and portfolio 1.</td></tr>';
    return;
  }

  holdings.forEach(function (holding) {
    body.innerHTML +=
      "<tr class=\"holding-row\" data-symbol=\"" + holding.symbol + "\" data-asset-type=\"" + holding.assetType + "\">" +
      "<td>" + holding.symbol + "</td>" +
      "<td>" + holding.assetLabel + "</td>" +
      "<td>" + formatNumber(holding.quantity) + "</td>" +
      "<td>" + formatCurrency(holding.buyPrice) + "</td>" +
      "<td>" + formatCurrency(holding.currentPrice) + "</td>" +
      "<td>" + formatCurrency(holding.currentValue) + "</td>" +
      "<td class=\"" + getProfitClass(holding.profit) + "\">" + formatCurrency(holding.profit) + "</td>" +
      "</tr>";
  });

  body.querySelectorAll(".holding-row").forEach(function (row) {
    row.addEventListener("click", function () {
      const symbol = row.getAttribute("data-symbol");
      const currentPriceCell = row.children[4];
      const currentPrice = currentPriceCell ? currentPriceCell.textContent : "";
      openStockOverview(symbol, currentPrice);
    });
  });
}

function initializeHoldingOverviewDrawer() {
  const overlay = document.getElementById("holdingOverviewOverlay");
  const closeButton = document.getElementById("holdingOverviewClose");
  const buyButton = document.getElementById("holdingOverviewBuyBtn");
  const sellButton = document.getElementById("holdingOverviewSellBtn");

  if (!overlay || !closeButton || !buyButton || !sellButton) {
    return;
  }

  closeButton.addEventListener("click", closeHoldingOverview);
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeHoldingOverview();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeHoldingOverview();
    }
  });

  buyButton.addEventListener("click", function () {
    redirectToInvestmentAction("buy");
  });

  sellButton.addEventListener("click", function () {
    redirectToInvestmentAction("sell");
  });
}

function openStockOverview(symbol, currentPrice) {
  const holding = holdingsCache.find(function (item) {
    return item.symbol === String(symbol || "").trim().toUpperCase();
  });

  if (!holding) {
    return;
  }

  if (currentPrice) {
    const numericCurrentPrice = Number(String(currentPrice).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(numericCurrentPrice) && numericCurrentPrice > 0) {
      holding.currentPrice = numericCurrentPrice;
      holding.currentValue = holding.quantity * numericCurrentPrice;
      holding.profit = holding.currentValue - holding.invested;
    }
  }

  showHoldingOverview(holding);
}

function showHoldingOverview(holding) {
  const overlay = document.getElementById("holdingOverviewOverlay");
  const title = document.getElementById("holdingOverviewTitle");
  const subtitle = document.getElementById("holdingOverviewSubtitle");
  const price = document.getElementById("holdingOverviewPrice");
  const pnlTag = document.getElementById("holdingOverviewPnlTag");
  const stats = document.getElementById("holdingOverviewStats");

  if (!overlay || !title || !subtitle || !price || !pnlTag || !stats) {
    return;
  }

  selectedHolding = holding;

  const pnlPercent = holding.invested > 0 ? (holding.profit / holding.invested) * 100 : 0;
  const formattedPnlPercent = (pnlPercent >= 0 ? "+" : "") + pnlPercent.toFixed(2) + "%";

  title.textContent = holding.symbol + " - " + holding.symbol;
  subtitle.innerHTML = '<span class="holding-overview-asset-badge">' + holding.assetLabel + '</span>';
  price.textContent = formatCurrency(holding.currentPrice);
  pnlTag.textContent = formattedPnlPercent;
  pnlTag.className = "holding-overview-pnl-tag " + getProfitClass(pnlPercent);

  stats.innerHTML =
    '<div class="holding-stat-card"><span>Quantity Owned</span><strong>' + formatNumber(holding.quantity) + "</strong></div>" +
    '<div class="holding-stat-card"><span>Average Buy Price</span><strong>' + formatCurrency(holding.buyPrice) + "</strong></div>" +
    '<div class="holding-stat-card"><span>Total Invested</span><strong>' + formatCurrency(holding.invested) + "</strong></div>" +
    '<div class="holding-stat-card"><span>Current Value</span><strong>' + formatCurrency(holding.currentValue) + "</strong></div>" +
    '<div class="holding-stat-card"><span>Net Profit / Loss</span><strong class="' + getProfitClass(holding.profit) + '">' + formatCurrency(holding.profit) + "</strong></div>" +
    '<div class="holding-stat-card"><span>P/L %</span><strong class="' + getProfitClass(pnlPercent) + '">' + formattedPnlPercent + "</strong></div>";

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");

  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      renderStockOverviewChart(holding.symbol, holding.currentPrice);
    });
  });
}

function closeHoldingOverview() {
  const overlay = document.getElementById("holdingOverviewOverlay");
  if (!overlay) {
    return;
  }

  if (holdingOverviewChartInstance) {
    holdingOverviewChartInstance.destroy();
    holdingOverviewChartInstance = null;
  }

  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
}

function redirectToInvestmentAction(action) {
  if (!selectedHolding) {
    return;
  }

  const url =
    "investment.html?symbol=" + encodeURIComponent(selectedHolding.symbol) +
    "&action=" + encodeURIComponent(action) +
    "&type=" + encodeURIComponent(selectedHolding.assetType);

  window.location.href = url;
}

async function renderStockOverviewChart(symbol, price) {
  var canvas = document.getElementById("stockOverviewChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  var holding = holdingsCache.find(function (item) {
    return item.symbol === String(symbol || "").trim().toUpperCase();
  });
  if (!holding) {
    return;
  }

  if (Number.isFinite(Number(price)) && Number(price) > 0) {
    holding.currentPrice = Number(price);
    holding.currentValue = holding.quantity * holding.currentPrice;
    holding.profit = holding.currentValue - holding.invested;
  }

  if (holdingOverviewChartInstance) {
    holdingOverviewChartInstance.destroy();
    holdingOverviewChartInstance = null;
  }

  var series = await buildPriceTrendSeries(holding);
  var ctx = canvas.getContext("2d");

  var isProfit = (holding.profit || 0) >= 0;
  var accentColor = isProfit ? "#00c08b" : "#f43f5e";
  var gradientRgb = isProfit ? "0, 192, 139" : "244, 63, 94";

  var gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, "rgba(" + gradientRgb + ", 0.35)");
  gradient.addColorStop(1, "rgba(" + gradientRgb + ", 0)");

  holdingOverviewChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: series.labels,
      datasets: [
        {
          label: holding.symbol + " Price",
          data: series.priceData,
          fill: true,
          backgroundColor: gradient,
          borderColor: accentColor,
          borderWidth: 2,
          tension: 0.35,
          pointStyle: "circle",
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: accentColor,
          pointBorderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: "easeInOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0f172a",
          titleColor: "#e2e8f0",
          bodyColor: "#94a3b8",
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            title: function (items) {
              return items && items[0] ? items[0].label : "";
            },
            label: function (context) {
              return "Price: " + formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          stacked: false,
          grid: { display: false },
          ticks: { color: "#94a3b8", maxTicksLimit: 7, font: { size: 11 } }
        },
        y: {
          stacked: false,
          grid: { color: "rgba(203, 213, 225, 0.5)" },
          ticks: {
            color: "#94a3b8",
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: function (value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });

  holdingOverviewChartInstance.resize();
}

async function buildPriceTrendSeries(holding) {
  const historySeries = await fetchPriceTrendSeriesFromApi(holding);
  if (historySeries && Array.isArray(historySeries.labels) && historySeries.labels.length) {
    return historySeries;
  }

  return buildFallbackPriceTrendSeries(holding);
}

async function fetchPriceTrendSeriesFromApi(holding) {
  try {
    const payload = await fetchJson("/market/history/" + encodeURIComponent(holding.symbol) + "?interval=1day");
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const keys = Object.keys(payload).sort();
    if (!keys.length) {
      return null;
    }

    const labels = [];
    const priceData = [];
    const limit = Math.min(30, keys.length);
    const start = keys.length - limit;

    for (let i = start; i < keys.length; i += 1) {
      const key = keys[i];
      const point = payload[key];
      if (!point || typeof point !== "object") {
        continue;
      }

      const closeRaw = toNumber(point["4. close"] != null ? point["4. close"] : point.close);
      if (!Number.isFinite(closeRaw) || closeRaw <= 0) {
        continue;
      }

      const converted = convertToInr(closeRaw, holding.sourceCurrency || "USD", usdInrRate);
      const parsedDate = parseChartDateKey(key);
      labels.push(parsedDate ? parsedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : key);
      priceData.push(+converted.toFixed(2));
    }

    if (!priceData.length) {
      return null;
    }

    priceData[priceData.length - 1] = +Number(holding.currentPrice || priceData[priceData.length - 1]).toFixed(2);
    return { labels: labels, priceData: priceData };
  } catch (error) {
    console.warn("[Portfolio] History API unavailable for", holding.symbol, error);
    return null;
  }
}

function parseChartDateKey(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  const normalized = text.length === 10 ? text + "T00:00:00" : text.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildFallbackPriceTrendSeries(holding) {
  var DAYS = 30;
  var labels = [];
  var priceData = [];

  var startPrice = Number(holding.buyPrice || holding.currentPrice || 100);
  var endPrice = Number(holding.currentPrice || startPrice);

  var transactions = transactionsCache
    .filter(function (tx) {
      return tx.symbol === holding.symbol && tx.assetType === holding.assetType;
    })
    .sort(function (a, b) { return a.isoDate.localeCompare(b.isoDate); });

  var txPriceByDate = {};
  transactions.forEach(function (tx) {
    if (tx.price) {
      txPriceByDate[tx.isoDate.split("T")[0]] = Number(tx.price);
    }
  });

  var seed = holding.symbol.split("").reduce(function (acc, ch) { return acc + ch.charCodeAt(0); }, 0);

  for (var i = 0; i < DAYS; i++) {
    var d = new Date(Date.now() - (DAYS - 1 - i) * 24 * 60 * 60 * 1000);
    var dayLabel = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    var isoStr = d.toISOString().split("T")[0];

    var progress = DAYS > 1 ? i / (DAYS - 1) : 1;
    var basePrice = startPrice + (endPrice - startPrice) * progress;

    if (txPriceByDate[isoStr]) {
      basePrice = txPriceByDate[isoStr];
    }

    var variation = basePrice * 0.008 * Math.sin((i + seed) * 1.3);
    var dayPrice = Math.max(0, basePrice + variation);

    labels.push(dayLabel);
    priceData.push(+dayPrice.toFixed(2));
  }

  priceData[DAYS - 1] = +endPrice.toFixed(2);

  return { labels: labels, priceData: priceData };
}

function renderTransactionsTable(transactions) {
  const body = document.getElementById("transactionHistoryBody");
  if (!body) {
    return;
  }

  body.innerHTML = "";
  if (!transactions.length) {
    body.innerHTML = '<tr><td colspan="6">No transactions recorded yet.</td></tr>';
    return;
  }

  transactions.slice(0, 8).forEach(function (transaction) {
    body.innerHTML +=
      "<tr>" +
      "<td>" + transaction.dateLabel + "</td>" +
      "<td>" + transaction.action + "</td>" +
      "<td>" + transaction.symbol + "</td>" +
      "<td>" + transaction.assetLabel + "</td>" +
      "<td>" + formatNumber(transaction.quantity) + "</td>" +
      "<td>" + formatCurrency(transaction.price) + "</td>" +
      "</tr>";
  });
}

function normalizeTransactions(transactions, holdings, usdInrRate) {
  const symbolCurrencyMap = {};
  holdings.forEach(function (row) {
    symbolCurrencyMap[row.symbol] = row.sourceCurrency || "USD";
  });

  return (Array.isArray(transactions) ? transactions : []).map(function (transaction) {
    const symbol = String(transaction.symbol || "").trim().toUpperCase();
    const sourceCurrency = symbolCurrencyMap[symbol] || "USD";
    const rawPrice = toNumber(transaction.price);
    const price = convertToInr(rawPrice, sourceCurrency, usdInrRate);
    const isoDate = normalizeIsoDate(transaction.transactionDate);

    return {
      symbol: symbol,
      assetType: String(transaction.assetType || "").toUpperCase(),
      assetLabel: getAssetLabel(transaction.assetType),
      action: String(transaction.transactionType || "-").toUpperCase(),
      quantity: toNumber(transaction.quantity),
      price: price,
      isoDate: isoDate,
      dateLabel: formatDateTime(transaction.transactionDate)
    };
  }).sort(function (a, b) {
    return b.isoDate.localeCompare(a.isoDate);
  });
}

function normalizeIsoDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
}

function formatDateTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getAssetLabel(assetType) {
  const key = String(assetType || "").trim().toUpperCase();
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

async function fetchQuote(symbol) {
  if (!symbol) {
    return null;
  }

  try {
    return await fetchJson("/market/quote/" + encodeURIComponent(symbol));
  } catch (error) {
    console.warn("[Portfolio] Quote unavailable for", symbol, error);
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
    console.warn("[Portfolio] USD-INR API unavailable, fallback used", DEFAULT_USD_INR_RATE, error);
  }

  return DEFAULT_USD_INR_RATE;
}

function convertToInr(amount, currency, usdInrRate) {
  const numeric = toNumber(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  const code = String(currency || "USD").trim().toUpperCase();
  if (code === "INR") {
    return numeric;
  }

  return numeric * usdInrRate;
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

function normalizeArrayPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.value)) {
    return payload.value;
  }
  return [];
}

function setLoadingState() {
  setText("portfolioInvested", "Loading...");
  setText("portfolioCurrent", "Loading...");
  setText("portfolioProfit", "Loading...");
  setText("portfolioAssets", "-");
}

function renderEmptyState(message) {
  setText("portfolioInvested", "N/A");
  setText("portfolioCurrent", "N/A");
  setText("portfolioProfit", "N/A");
  setText("portfolioAssets", "0");

  const holdingsBody = document.getElementById("portfolioHoldingsBody");
  if (holdingsBody) {
    holdingsBody.innerHTML = "<tr><td colspan='7'>" + message + "</td></tr>";
  }

  const txBody = document.getElementById("transactionHistoryBody");
  if (txBody) {
    txBody.innerHTML = "<tr><td colspan='6'>" + message + "</td></tr>";
  }
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
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(safeValue);
}

function getProfitClass(value) {
  if (value > 0) {
    return "profit-positive";
  }
  if (value < 0) {
    return "profit-negative";
  }
  return "profit-neutral";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
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
