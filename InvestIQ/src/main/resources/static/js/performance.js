let pnlChartInstance = null;
let assetChartInstance = null;

const PERFORMANCE_USER_ID = 1;
const PERFORMANCE_PORTFOLIO_ID = 1;
const DISPLAY_CURRENCY = "INR";
const DEFAULT_USD_INR_RATE = 83;
const API_BASE_CANDIDATES = buildApiBaseCandidates();

document.addEventListener("DOMContentLoaded", function () {
  loadPerformancePage();
});

async function loadPerformancePage() {
  try {
    const usdInrRate = await fetchUsdInrRate();

    const [investmentsPayload, transactionsPayload] = await Promise.all([
      fetchInvestments(),
      fetchTransactions()
    ]);

    const holdings = normalizeHoldings(investmentsPayload);
    const transactions = normalizeTransactions(transactionsPayload);

    const symbols = uniqueSymbols(holdings);
    const quoteMap = await fetchQuotesForSymbols(symbols);
    const historyMap = await fetchDailyHistoryForSymbols(symbols);

    const summaryRows = buildSummaryRows(holdings, quoteMap, usdInrRate);
    renderSummaryAndTable(summaryRows);

    const timeline = buildTimelineSeries(transactions, symbols, historyMap, quoteMap, usdInrRate);
    renderPnLTimelineChart(timeline);
    renderAssetPerformanceChart(timeline, symbols);
  } catch (error) {
    console.error("[Performance] Failed to load:", error);
    renderEmptyPerformance("Unable to load performance data from backend.");
  }
}

function normalizeHoldings(payload) {
  return normalizeArrayPayload(payload).map(function (row) {
    return {
      symbol: String(row.symbol || "").trim().toUpperCase(),
      assetType: normalizeAssetType(row.assetType),
      quantity: toNumber(row.quantity),
      purchasePrice: toNumber(row.purchasePrice)
    };
  }).filter(function (row) {
    return row.symbol && row.quantity > 0 && Number.isFinite(row.purchasePrice) && row.purchasePrice > 0;
  });
}

function normalizeTransactions(payload) {
  return normalizeArrayPayload(payload).map(function (row) {
    const dt = parseDate(row.transactionDate);
    return {
      symbol: String(row.symbol || "").trim().toUpperCase(),
      assetType: normalizeAssetType(row.assetType),
      action: String(row.transactionType || "").trim().toUpperCase(),
      quantity: toNumber(row.quantity),
      price: toNumber(row.price),
      date: dt,
      dayKey: toDayKey(dt)
    };
  }).filter(function (row) {
    return row.symbol && (row.action === "BUY" || row.action === "SELL") && row.quantity > 0 && Number.isFinite(row.price) && row.price > 0;
  }).sort(function (a, b) {
    return a.date.getTime() - b.date.getTime();
  });
}

function buildSummaryRows(holdings, quoteMap, usdInrRate) {
  return holdings.map(function (holding) {
    const quote = quoteMap[holding.symbol] || null;
    const quoteCurrency = parseCurrency(quote) || "USD";
    const livePriceRaw = parsePriceFromQuote(quote);
    const safeCurrentRaw = Number.isFinite(livePriceRaw) && livePriceRaw > 0 ? livePriceRaw : holding.purchasePrice;

    const buyInr = convertToInr(holding.purchasePrice, quoteCurrency, usdInrRate);
    const currentInr = convertToInr(safeCurrentRaw, quoteCurrency, usdInrRate);

    const invested = holding.quantity * buyInr;
    const currentValue = holding.quantity * currentInr;
    const profit = currentValue - invested;

    return {
      symbol: holding.symbol,
      assetType: holding.assetType,
      invested: invested,
      currentValue: currentValue,
      profit: profit
    };
  });
}

function renderSummaryAndTable(rows) {
  const totalInvested = rows.reduce(function (sum, row) { return sum + row.invested; }, 0);
  const totalCurrent = rows.reduce(function (sum, row) { return sum + row.currentValue; }, 0);
  const totalProfit = totalCurrent - totalInvested;

  let best = null;
  rows.forEach(function (row) {
    if (!best || row.profit > best.profit) {
      best = row;
    }
  });

  setText("performanceInvested", formatCurrency(totalInvested));
  setText("performanceCurrent", formatCurrency(totalCurrent));
  setText("performanceProfit", formatCurrency(totalProfit));
  setText("bestPerformer", best ? best.symbol : "-");

  const profitEl = document.getElementById("performanceProfit");
  if (profitEl) {
    profitEl.classList.remove("profit-positive", "profit-negative", "profit-neutral");
    profitEl.classList.add(getProfitClass(totalProfit));
  }

  const body = document.getElementById("performanceTableBody");
  if (!body) {
    return;
  }

  body.innerHTML = "";
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5">No holdings found for user 1 portfolio 1.</td></tr>';
    return;
  }

  rows.forEach(function (row) {
    body.innerHTML +=
      "<tr>" +
      "<td><strong>" + row.symbol + "</strong></td>" +
      "<td>" + getAssetLabel(row.assetType) + "</td>" +
      "<td>" + formatCurrency(row.invested) + "</td>" +
      "<td>" + formatCurrency(row.currentValue) + "</td>" +
      "<td class='" + getProfitClass(row.profit) + "'>" + formatCurrency(row.profit) + "</td>" +
      "</tr>";
  });
}

function buildTimelineSeries(transactions, symbols, historyMap, quoteMap, usdInrRate) {
  const dates = buildDateRange(transactions, 45);
  const positions = {};
  const investedSeries = [];
  const currentSeries = [];
  const profitSeries = [];
  const labels = [];
  const perSymbolSeries = {};

  symbols.forEach(function (symbol) {
    positions[symbol] = 0;
    perSymbolSeries[symbol] = [];
  });

  let txIndex = 0;
  let investedCapital = 0;

  for (let i = 0; i < dates.length; i += 1) {
    const day = dates[i];
    const dayKey = toDayKey(day);

    while (txIndex < transactions.length && transactions[txIndex].date.getTime() <= endOfDay(day).getTime()) {
      const tx = transactions[txIndex];
      if (positions[tx.symbol] == null) {
        positions[tx.symbol] = 0;
        perSymbolSeries[tx.symbol] = [];
      }

      const txInr = convertToInr(tx.price, "USD", usdInrRate) * tx.quantity;
      if (tx.action === "BUY") {
        positions[tx.symbol] += tx.quantity;
        investedCapital += txInr;
      } else if (tx.action === "SELL") {
        positions[tx.symbol] = Math.max(0, positions[tx.symbol] - tx.quantity);
        investedCapital -= txInr;
      }
      txIndex += 1;
    }

    let currentValue = 0;
    symbols.forEach(function (symbol) {
      const qty = positions[symbol] || 0;
      const closeRaw = resolveCloseOnOrBefore(historyMap[symbol], dayKey, quoteMap[symbol]);
      const currency = parseCurrency(quoteMap[symbol]) || "USD";
      const closeInr = convertToInr(closeRaw, currency, usdInrRate);

      if (qty > 0 && Number.isFinite(closeInr)) {
        currentValue += qty * closeInr;
      }

      // Plot raw price series (INR) for per-asset chart.
      perSymbolSeries[symbol].push(Number.isFinite(closeInr) ? closeInr : null);
    });

    const investedSafe = Math.max(0, investedCapital);
    const profit = currentValue - investedSafe;

    labels.push(formatDayLabel(day));
    investedSeries.push(round2(investedSafe));
    currentSeries.push(round2(currentValue));
    profitSeries.push(round2(profit));
  }

  return {
    labels: labels,
    investedSeries: investedSeries,
    currentSeries: currentSeries,
    profitSeries: profitSeries,
    perSymbolSeries: perSymbolSeries
  };
}

function renderPnLTimelineChart(timeline) {
  const canvas = document.getElementById("profitLossChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  if (pnlChartInstance) {
    pnlChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");

  pnlChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: timeline.labels,
      datasets: [
        {
          label: "Invested (INR)",
          data: timeline.investedSeries,
          borderColor: "#64748b",
          backgroundColor: "rgba(100, 116, 139, 0.08)",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0
        },
        {
          label: "Current Value (INR)",
          data: timeline.currentSeries,
          borderColor: "#00baf2",
          backgroundColor: "rgba(0, 186, 242, 0.12)",
          borderWidth: 3,
          tension: 0.25,
          pointRadius: 0
        },
        {
          label: "Profit / Loss (INR)",
          data: timeline.profitSeries,
          borderColor: "#00c08b",
          backgroundColor: "rgba(0, 192, 139, 0.10)",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.dataset.label + ": " + formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

function renderAssetPerformanceChart(timeline, symbols) {
  const canvas = document.getElementById("valueComparisonChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  if (assetChartInstance) {
    assetChartInstance.destroy();
  }

  const palette = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"];
  const datasets = symbols.map(function (symbol, index) {
    return {
      label: symbol + " Price (INR)",
      data: timeline.perSymbolSeries[symbol] || [],
      borderColor: palette[index % palette.length],
      backgroundColor: "transparent",
      borderWidth: 2,
      tension: 0.22,
      pointRadius: 0
    };
  });

  assetChartInstance = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: timeline.labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.dataset.label + ": " + formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

function renderEmptyPerformance(message) {
  setText("performanceInvested", "N/A");
  setText("performanceCurrent", "N/A");
  setText("performanceProfit", "N/A");
  setText("bestPerformer", "-");

  const body = document.getElementById("performanceTableBody");
  if (body) {
    body.innerHTML = "<tr><td colspan='5'>" + message + "</td></tr>";
  }
}

async function fetchInvestments() {
  const paths = [
    "/investments/portfolio/" + PERFORMANCE_PORTFOLIO_ID,
    "/investments/user/" + PERFORMANCE_USER_ID
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

async function fetchTransactions() {
  return await fetchJson("/transactions/" + PERFORMANCE_PORTFOLIO_ID);
}

async function fetchQuotesForSymbols(symbols) {
  const map = {};
  await Promise.all(symbols.map(async function (symbol) {
    try {
      map[symbol] = await fetchJson("/market/quote/" + encodeURIComponent(symbol));
    } catch (error) {
      map[symbol] = null;
    }
  }));
  return map;
}

async function fetchDailyHistoryForSymbols(symbols) {
  const map = {};
  await Promise.all(symbols.map(async function (symbol) {
    try {
      const payload = await fetchJson("/market/history/" + encodeURIComponent(symbol) + "?interval=1day");
      map[symbol] = normalizeHistoryMap(payload);
    } catch (error) {
      map[symbol] = {};
    }
  }));
  return map;
}

function normalizeHistoryMap(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const normalized = {};
  Object.keys(payload).forEach(function (key) {
    const point = payload[key];
    if (!point || typeof point !== "object") {
      return;
    }

    const close = firstValidNumber([point["4. close"], point.close, point.price]);
    if (!Number.isFinite(close) || close <= 0) {
      return;
    }

    const dayKey = normalizeHistoryKeyToDay(key);
    if (!dayKey) {
      return;
    }

    normalized[dayKey] = close;
  });
  return normalized;
}

function normalizeHistoryKeyToDay(key) {
  const value = String(key || "").trim();
  if (!value) {
    return "";
  }

  const parsed = new Date(value.length === 10 ? value + "T00:00:00" : value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return toDayKey(parsed);
}

function resolveCloseOnOrBefore(historyByDay, targetDayKey, quotePayload) {
  if (historyByDay && historyByDay[targetDayKey] != null) {
    return historyByDay[targetDayKey];
  }

  if (historyByDay) {
    const keys = Object.keys(historyByDay).sort();
    for (let i = keys.length - 1; i >= 0; i -= 1) {
      if (keys[i] <= targetDayKey) {
        return historyByDay[keys[i]];
      }
    }
  }

  const fallback = parsePriceFromQuote(quotePayload);
  return Number.isFinite(fallback) ? fallback : NaN;
}

function buildDateRange(transactions, maxDays) {
  const today = stripTime(new Date());
  const fromTx = transactions.length ? stripTime(transactions[0].date) : today;

  const earliest = new Date(today);
  earliest.setDate(today.getDate() - (maxDays - 1));

  const start = fromTx < earliest ? earliest : fromTx;

  const dates = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  if (!dates.length) {
    dates.push(today);
  }

  return dates;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function toDayKey(date) {
  return date.toISOString().split("T")[0];
}

function formatDayLabel(date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function uniqueSymbols(rows) {
  const seen = {};
  const symbols = [];
  rows.forEach(function (row) {
    if (!seen[row.symbol]) {
      seen[row.symbol] = true;
      symbols.push(row.symbol);
    }
  });
  return symbols;
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

function parsePriceFromQuote(quote) {
  if (!quote || typeof quote !== "object") {
    return NaN;
  }
  return firstValidNumber([
    quote["05. price"],
    quote["4. close"],
    quote.close,
    quote.price,
    quote.c
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
    console.warn("[Performance] USD-INR API unavailable, fallback used", DEFAULT_USD_INR_RATE, error);
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

function parseDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0);
  }
  return parsed;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
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

function getProfitClass(value) {
  if (value > 0) {
    return "profit-positive";
  }
  if (value < 0) {
    return "profit-negative";
  }
  return "profit-neutral";
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

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
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

