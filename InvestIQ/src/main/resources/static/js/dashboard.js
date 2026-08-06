const DASHBOARD_USER_ID = 1;
const DASHBOARD_PORTFOLIO_ID = 1;
const API_BASE_CANDIDATES = buildApiBaseCandidates();
const DISPLAY_CURRENCY = "INR";
const DEFAULT_USD_INR_RATE = 83;

let allocationChartInstance = null;

document.addEventListener("DOMContentLoaded", function () {
  loadDashboard();
});

async function loadDashboard() {
  setLoadingState();

  try {
    const investments = await fetchInvestments();
    if (!Array.isArray(investments) || !investments.length) {
      renderEmptyDashboard("No investments found for user " + DASHBOARD_USER_ID + " and portfolio " + DASHBOARD_PORTFOLIO_ID + ".");
      return;
    }

    const usdInrRate = await fetchUsdInrRate();
    const holdings = await buildHoldings(investments, usdInrRate);

    if (!holdings.length) {
      renderEmptyDashboard("Investments were found, but data could not be parsed for dashboard cards.");
      return;
    }

    renderDashboard(holdings);
  } catch (error) {
    console.error("[Dashboard] Failed to load dashboard:", error);
    renderEmptyDashboard("Unable to load dashboard data from backend. Check backend is running on port 8083.");
  }
}

async function fetchInvestments() {
  const paths = [
    "/investments/portfolio/" + DASHBOARD_PORTFOLIO_ID,
    "/investments/user/" + DASHBOARD_USER_ID
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

async function buildHoldings(investments, usdInrRate) {
  const tasks = investments.map(async function (investment) {
    const symbol = String(investment.symbol || "").trim().toUpperCase();
    const quantity = toNumber(investment.quantity);
    const buyPrice = toNumber(investment.purchasePrice);

    if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(buyPrice) || buyPrice <= 0) {
      return null;
    }

    const quote = await fetchQuote(symbol);
    const currentPrice = quote ? parsePriceFromQuote(quote) : NaN;
    const safeCurrentPrice = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : buyPrice;
    const marketCurrency = parseCurrency(quote) || "USD";

    const buyPriceInInr = convertToInr(buyPrice, marketCurrency, usdInrRate);
    const currentPriceInInr = convertToInr(safeCurrentPrice, marketCurrency, usdInrRate);

    const invested = quantity * buyPriceInInr;
    const currentValue = quantity * currentPriceInInr;

    return {
      symbol: symbol,
      assetType: String(investment.assetType || "").toUpperCase(),
      quantity: quantity,
      buyPrice: buyPriceInInr,
      currentPrice: currentPriceInInr,
      invested: invested,
      currentValue: currentValue,
      profit: currentValue - invested,
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

function renderDashboard(holdings) {
  const totalInvested = holdings.reduce(function (sum, h) { return sum + h.invested; }, 0);
  const totalCurrent = holdings.reduce(function (sum, h) { return sum + h.currentValue; }, 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalAssets = holdings.length;
  const baseCurrency = holdings[0] && holdings[0].currency ? holdings[0].currency : "USD";

  setText("investmentValue", formatCurrency(totalInvested, baseCurrency));
  setText("currentValue", formatCurrency(totalCurrent, baseCurrency));
  setText("profitValue", formatCurrency(totalProfit, baseCurrency));
  setText("totalAssets", String(totalAssets));

  const profitElement = document.getElementById("profitValue");
  if (profitElement) {
    profitElement.classList.remove("profit-positive", "profit-negative", "profit-neutral");
    profitElement.classList.add(profitClass(totalProfit));
  }

  renderPortfolioTable(holdings);
  renderAllocationChart(buildAllocationData(holdings), baseCurrency);
}

function renderPortfolioTable(holdings) {
  const body = document.getElementById("portfolioBody");
  if (!body) {
    return;
  }

  body.innerHTML = "";
  holdings.forEach(function (holding) {
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" + holding.symbol + "</td>" +
      "<td>" + formatNumber(holding.quantity) + "</td>" +
      "<td>" + formatCurrency(holding.buyPrice, holding.currency) + "</td>" +
      "<td>" + formatCurrency(holding.currentPrice, holding.currency) + "</td>" +
      "<td class='" + profitClass(holding.profit) + "'>" + formatCurrency(holding.profit, holding.currency) + "</td>";
    body.appendChild(row);
  });
}

function buildAllocationData(holdings) {
  const totals = { STOCK: 0, BOND: 0, COMMODITY: 0, OTHER: 0 };
  holdings.forEach(function (holding) {
    if (holding.assetType === "STOCK") {
      totals.STOCK += holding.currentValue;
      return;
    }
    if (holding.assetType === "BOND") {
      totals.BOND += holding.currentValue;
      return;
    }
    if (holding.assetType === "COMMODITY") {
      totals.COMMODITY += holding.currentValue;
      return;
    }
    totals.OTHER += holding.currentValue;
  });

  const labels = [];
  const values = [];
  if (totals.STOCK > 0) {
    labels.push("Stocks");
    values.push(totals.STOCK);
  }
  if (totals.BOND > 0) {
    labels.push("Bonds");
    values.push(totals.BOND);
  }
  if (totals.COMMODITY > 0) {
    labels.push("Commodities");
    values.push(totals.COMMODITY);
  }
  if (totals.OTHER > 0) {
    labels.push("Other");
    values.push(totals.OTHER);
  }

  if (!values.length) {
    labels.push("No Allocation");
    values.push(1);
  }

  return { labels: labels, values: values };
}

function renderAllocationChart(allocation, currency) {
  const canvas = document.getElementById("allocationChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  const ctx = canvas.getContext("2d");
  const stockGradient = ctx.createLinearGradient(0, 0, 0, 300);
  stockGradient.addColorStop(0, "#3b82f6");
  stockGradient.addColorStop(1, "#1d4ed8");
  const bondGradient = ctx.createLinearGradient(0, 0, 0, 300);
  bondGradient.addColorStop(0, "#8b5cf6");
  bondGradient.addColorStop(1, "#6d28d9");
  const commodityGradient = ctx.createLinearGradient(0, 0, 0, 300);
  commodityGradient.addColorStop(0, "#f59e0b");
  commodityGradient.addColorStop(1, "#d97706");
  const otherGradient = ctx.createLinearGradient(0, 0, 0, 300);
  otherGradient.addColorStop(0, "#10b981");
  otherGradient.addColorStop(1, "#047857");

  if (allocationChartInstance) {
    allocationChartInstance.destroy();
  }

  allocationChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: allocation.labels,
      datasets: [{
        data: allocation.values,
        backgroundColor: [stockGradient, bondGradient, commodityGradient, otherGradient],
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: "circle",
            font: { size: 13, weight: "600", family: "'Plus Jakarta Sans', sans-serif" },
            color: "#334155"
          }
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleFont: { size: 14, weight: "700" },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: function (context) {
              return " " + context.label + ": " + formatCurrency(context.parsed, currency);
            }
          }
        }
      }
    }
  });
}

async function fetchQuote(symbol) {
  if (!symbol) {
    return null;
  }

  try {
    return await fetchJson("/market/quote/" + encodeURIComponent(symbol));
  } catch (error) {
    console.warn("[Dashboard] Quote unavailable for", symbol, error);
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
    console.warn("[Dashboard] USD-INR conversion API unavailable, using fallback rate", DEFAULT_USD_INR_RATE, error);
  }

  return DEFAULT_USD_INR_RATE;
}

function convertToInr(amount, currency, usdInrRate) {
  const value = toNumber(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const code = String(currency || "USD").trim().toUpperCase();
  if (code === "INR") {
    return value;
  }
  if (code === "USD") {
    return value * usdInrRate;
  }

  // Unknown currency is treated as USD to keep dashboard usable for now.
  return value * usdInrRate;
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

      const json = await response.json();
      return json;
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
  setText("investmentValue", "Loading...");
  setText("currentValue", "Loading...");
  setText("profitValue", "Loading...");
  setText("totalAssets", "-");
}

function renderEmptyDashboard(message) {
  setText("investmentValue", "N/A");
  setText("currentValue", "N/A");
  setText("profitValue", "N/A");
  setText("totalAssets", "0");

  const body = document.getElementById("portfolioBody");
  if (body) {
    body.innerHTML = "<tr><td colspan='5'>" + message + "</td></tr>";
  }
}

function formatCurrency(amount, currency) {
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

function profitClass(value) {
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
  } else {
    // When opened as file://, there is no same-origin backend, so try defaults.
    candidates.push("http://localhost:8083");
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
