document.addEventListener("DOMContentLoaded", function () {
  if (!window.InvestIQStore) {
    return;
  }

  initializeHoldingOverviewDrawer();
  renderPortfolioPage();
});

let holdingOverviewChartInstance = null;
let selectedHolding = null;

const knownCompanyNames = {
  AAPL: "Apple Inc.",
  TSLA: "Tesla Inc.",
  RELIANCE: "Reliance Industries Ltd",
  TCS: "Tata Consultancy Services",
  INFY: "Infosys Ltd",
  HDFCBANK: "HDFC Bank Ltd",
  BAJAJFINSV: "Bajaj Finserv Ltd",
  GOLD: "Gold Commodity",
  UST10Y: "US Treasury 10Y"
};

function renderPortfolioPage() {
  const summary = window.InvestIQStore.getSummary();
  const holdings = window.InvestIQStore.getHoldings();
  const transactions = window.InvestIQStore.getTransactions().slice(0, 8);

  setText("portfolioInvested", window.InvestIQStore.formatCurrency(summary.totalInvested));
  setText("portfolioCurrent", window.InvestIQStore.formatCurrency(summary.currentValue));
  setText("portfolioProfit", window.InvestIQStore.formatCurrency(summary.totalProfit));
  setText("portfolioAssets", window.InvestIQStore.formatNumber(summary.totalAssets));

  renderHoldingsTable(holdings);
  renderTransactionsTable(transactions);
}

function renderHoldingsTable(holdings) {
  const body = document.getElementById("portfolioHoldingsBody");
  if (!body) {
    return;
  }

  body.innerHTML = "";
  if (!holdings.length) {
    body.innerHTML = '<tr><td colspan="7">No holdings available. Add a buy transaction to get started.</td></tr>';
    return;
  }

  holdings.forEach(function (holding) {
    body.innerHTML +=
      "<tr class=\"holding-row\" data-symbol=\"" + holding.symbol + "\" data-asset-type=\"" + holding.assetType + "\">" +
      "<td>" + holding.symbol + "</td>" +
      "<td>" + holding.assetLabel + "</td>" +
      "<td>" + window.InvestIQStore.formatNumber(holding.quantity) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(holding.buyPrice) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(holding.currentPrice) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(holding.currentValue) + "</td>" +
      "<td class=\"" + getProfitClass(holding.profit) + "\">" + window.InvestIQStore.formatCurrency(holding.profit) + "</td>" +
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
  const holdings = window.InvestIQStore.getHoldings();
  const holding = holdings.find(function (item) {
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
  const companyName = knownCompanyNames[holding.symbol] || holding.symbol;
  const formattedPnlPercent = (pnlPercent >= 0 ? "+" : "") + pnlPercent.toFixed(2) + "%";

  title.textContent = holding.symbol + " - " + companyName;
  subtitle.innerHTML = '<span class="holding-overview-asset-badge">' + holding.assetLabel + '</span>';
  price.textContent = window.InvestIQStore.formatCurrency(holding.currentPrice);
  pnlTag.textContent = formattedPnlPercent;
  pnlTag.className = "holding-overview-pnl-tag " + getProfitClass(pnlPercent);

  stats.innerHTML =
    '<div class="holding-stat-card"><span>Quantity Owned</span><strong>' + window.InvestIQStore.formatNumber(holding.quantity) + "</strong></div>" +
    '<div class="holding-stat-card"><span>Average Buy Price</span><strong>' + window.InvestIQStore.formatCurrency(holding.buyPrice) + "</strong></div>" +
    '<div class="holding-stat-card"><span>Total Invested</span><strong>' + window.InvestIQStore.formatCurrency(holding.invested) + "</strong></div>" +
    '<div class="holding-stat-card"><span>Current Value</span><strong>' + window.InvestIQStore.formatCurrency(holding.currentValue) + "</strong></div>" +
    '<div class="holding-stat-card"><span>Net Profit / Loss</span><strong class="' + getProfitClass(holding.profit) + '">' + window.InvestIQStore.formatCurrency(holding.profit) + "</strong></div>" +
    '<div class="holding-stat-card"><span>P/L %</span><strong class="' + getProfitClass(pnlPercent) + '">' + formattedPnlPercent + "</strong></div>";

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");

  // Double-RAF ensures the browser has fully computed layout for the newly-visible
  // overlay before Chart.js tries to measure the canvas dimensions.
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

function renderStockOverviewChart(symbol, price) {
  var canvas = document.getElementById("stockOverviewChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  var holdings = window.InvestIQStore.getHoldings();
  var holding = holdings.find(function (item) {
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

  // Destroy any previous instance before creating a new one
  if (holdingOverviewChartInstance) {
    holdingOverviewChartInstance.destroy();
    holdingOverviewChartInstance = null;
  }

  var series = buildPriceTrendSeries(holding);
  var ctx = canvas.getContext("2d");

  // Choose accent colour based on P&L direction
  var isProfit = (holding.profit || 0) >= 0;
  var accentColor = isProfit ? "#00c08b" : "#f43f5e";
  var gradientRgb  = isProfit ? "0, 192, 139" : "244, 63, 94";

  // Smooth gradient fill under the line
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
          borderWidth: 3,
          tension: 0.35,
          pointStyle: "circle",
          pointRadius: 6,
          pointHoverRadius: 9,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: accentColor,
          pointBorderWidth: 3
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
              return "Price: " + window.InvestIQStore.formatCurrency(context.parsed.y);
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
              return window.InvestIQStore.formatCurrency(value);
            }
          }
        }
      }
    }
  });

  // Force a resize so Chart.js re-measures the canvas after the overlay becomes visible.
  holdingOverviewChartInstance.resize();
}

function buildPriceTrendSeries(holding) {
  var DAYS = 30;
  var labels = [];
  var priceData = [];

  var startPrice = Number(holding.buyPrice || holding.currentPrice || 100);
  var endPrice   = Number(holding.currentPrice || startPrice);

  // Build a lookup of ISO-date → transaction price from real transaction history
  var transactions = window.InvestIQStore
    .getTransactions()
    .filter(function (tx) {
      return tx.symbol === holding.symbol && tx.assetType === holding.assetType;
    })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });

  var txPriceByDate = {};
  transactions.forEach(function (tx) {
    if (tx.price) {
      txPriceByDate[tx.date] = Number(tx.price);
    }
  });

  // Seed value for deterministic micro-variation (avoids random() so chart is stable)
  var seed = holding.symbol.split("").reduce(function (acc, ch) { return acc + ch.charCodeAt(0); }, 0);

  for (var i = 0; i < DAYS; i++) {
    var d = new Date(Date.now() - (DAYS - 1 - i) * 24 * 60 * 60 * 1000);
    var dayLabel = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); // "06 Aug"
    var isoStr   = d.toISOString().split("T")[0];

    // Linear interpolation between start price and end price
    var progress  = DAYS > 1 ? i / (DAYS - 1) : 1;
    var basePrice = startPrice + (endPrice - startPrice) * progress;

    // If a real transaction exists on this date, use it as a hard anchor
    if (txPriceByDate[isoStr]) {
      basePrice = txPriceByDate[isoStr];
    }

    // Deterministic sine-wave micro-variation (±0.8 % max) for a natural look
    var variation = basePrice * 0.008 * Math.sin((i + seed) * 1.3);
    var dayPrice  = Math.max(0, basePrice + variation);

    labels.push(dayLabel);
    priceData.push(+dayPrice.toFixed(2));
  }

  // Pin the last point exactly to the current price
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

  transactions.forEach(function (transaction) {
    body.innerHTML +=
      "<tr>" +
      "<td>" + transaction.date + "</td>" +
      "<td>" + transaction.action + "</td>" +
      "<td>" + transaction.symbol + "</td>" +
      "<td>" + transaction.assetLabel + "</td>" +
      "<td>" + window.InvestIQStore.formatNumber(transaction.quantity) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(transaction.price) + "</td>" +
      "</tr>";
  });
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
    element.innerText = value;
  }
}

