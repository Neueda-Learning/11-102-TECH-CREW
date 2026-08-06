document.addEventListener("DOMContentLoaded", function () {
  if (!window.InvestIQStore) {
    return;
  }

  initializeStockSymbolSearch();
  initializeSellOwnedAssetSearch();
  setDefaultDates();
  bindForms();
  renderTransactions();
  applyInvestmentUrlParams();
});

const availableStocks = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "INFY", name: "Infosys Ltd" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv Ltd" },
  { symbol: "BA", name: "Boeing Co" },
  { symbol: "BABA", name: "Alibaba Group Holding Ltd" },
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "TSLA", name: "Tesla Inc." }
];

const ALPHA_VANTAGE_SEARCH_URL = "https://www.alphavantage.co/query";

function getAlphaVantageSearchApiKey() {
  // Frontend cannot read Spring application.properties directly.
  return (
    window.ALPHA_VANTAGE_SEARCH_API_KEY ||
    localStorage.getItem("alphaVantageSearchApiKey") ||
    "demo"
  );
}

function isDemoApiKey(apiKey) {
  return String(apiKey || "").trim().toLowerCase() === "demo";
}

let refreshStockSearchState = function () {};
let refreshSellOwnedAssetState = function () {};

function setDefaultDates() {
  const defaultDate = window.InvestIQStore.getDefaultDate();
  const buyDate = document.getElementById("buyDate");
  const sellDate = document.getElementById("sellDate");

  if (buyDate) {
    buyDate.value = defaultDate;
  }
  if (sellDate) {
    sellDate.value = defaultDate;
  }
}

function bindForms() {
  const buyForm = document.getElementById("buyForm");
  const sellForm = document.getElementById("sellForm");

  if (buyForm) {
    buyForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearStatus("sellStatus");

      try {
        const data = new FormData(buyForm);
        const result = window.InvestIQStore.buyInvestment({
          assetType: data.get("assetType"),
          symbol: data.get("symbol"),
          quantity: data.get("quantity"),
          buyPrice: data.get("buyPrice"),
          currentPrice: data.get("currentPrice"),
          date: data.get("date")
        });

        showStatus("buyStatus", result.message, "success");
        buyForm.reset();
        refreshStockSearchState();
        refreshSellOwnedAssetState();
        setDefaultDates();
        renderTransactions();
      } catch (error) {
        showStatus("buyStatus", error.message, "error");
      }
    });
  }

  if (sellForm) {
    sellForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearStatus("buyStatus");

      try {
        const data = new FormData(sellForm);
        const sellQuantityInput = document.getElementById("sellQuantity");
        const maxQuantity = Number((sellQuantityInput && sellQuantityInput.max) || 0);
        const requestedQuantity = Number(data.get("quantity") || 0);
        if (maxQuantity > 0 && requestedQuantity > maxQuantity) {
          throw new Error("Cannot sell more than available quantity (" + maxQuantity + ").");
        }

        const result = window.InvestIQStore.sellInvestment({
          symbol: data.get("symbol"),
          quantity: data.get("quantity"),
          sellPrice: data.get("sellPrice"),
          date: data.get("date")
        });

        showStatus("sellStatus", result.message, "success");
        sellForm.reset();
        refreshSellOwnedAssetState();
        setDefaultDates();
        renderTransactions();
      } catch (error) {
        showStatus("sellStatus", error.message, "error");
      }
    });
  }
}

function initializeStockSymbolSearch() {
  const assetTypeSelect = document.getElementById("buyAssetType");
  const symbolInput = document.getElementById("buySymbol");
  const suggestionBox = document.getElementById("buySymbolSuggestions");
  const container = document.getElementById("buySymbolSearchContainer");

  if (!assetTypeSelect || !symbolInput || !suggestionBox || !container) {
    return;
  }

  let searchDebounceTimer = null;
  let activeSearchToken = 0;

  assetTypeSelect.addEventListener("change", function () {
    refreshStockSearchState();
  });

  symbolInput.addEventListener("focus", function () {
    if (!isStockAssetTypeSelected()) {
      return;
    }
    const query = String(symbolInput.value || "").trim();
    if (!query) {
      hideStockSuggestions();
      return;
    }
    queueStockSearch(query);
  });

  symbolInput.addEventListener("input", function () {
    if (!isStockAssetTypeSelected()) {
      hideStockSuggestions();
      return;
    }
    if (!String(symbolInput.value || "").trim()) {
      hideStockSuggestions();
      return;
    }
    queueStockSearch(symbolInput.value);
  });

  symbolInput.addEventListener("blur", function () {
    setTimeout(hideStockSuggestions, 120);
  });

  document.addEventListener("click", function (event) {
    if (!container.contains(event.target)) {
      hideStockSuggestions();
    }
  });

  function isStockAssetTypeSelected() {
    return assetTypeSelect.value === "STOCK";
  }

  function refreshPlaceholder() {
    symbolInput.placeholder = isStockAssetTypeSelected()
      ? "Search symbol or company name"
      : "AAPL or GOLD";
  }

  function renderStockSuggestions(searchText) {
    const query = String(searchText || "").trim().toLowerCase();
    const matches = availableStocks
      .filter(function (stock) {
        return (
          stock.symbol.toLowerCase().indexOf(query) !== -1 ||
          stock.name.toLowerCase().indexOf(query) !== -1
        );
      })
      .slice(0, 5);

    if (!matches.length) {
      suggestionBox.innerHTML = '<div class="symbol-suggestion-empty">No matching ticker found</div>';
      suggestionBox.classList.remove("hidden");
      return;
    }

    suggestionBox.innerHTML = matches
      .map(function (stock) {
        return (
          '<button type="button" class="symbol-suggestion-item" data-symbol="' + stock.symbol + '">' +
            "<strong>" + stock.symbol + "</strong><span>- " + stock.name + "</span>" +
          "</button>"
        );
      })
      .join("");

    suggestionBox.classList.remove("hidden");
  }

  function queueStockSearch(searchText) {
    const query = String(searchText || "").trim();

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    if (query.length < 2) {
      hideStockSuggestions();
      return;
    }

    searchDebounceTimer = setTimeout(function () {
      suggestionBox.innerHTML = '<div class="symbol-suggestion-empty">Searching tickers...</div>';
      suggestionBox.classList.remove("hidden");
      fetchAndRenderStockSuggestions(query);
    }, 280);
  }

  async function fetchAndRenderStockSuggestions(queryText) {
    const myToken = ++activeSearchToken;

    try {
      const apiKey = getAlphaVantageSearchApiKey();
      if (isDemoApiKey(apiKey)) {
        suggestionBox.innerHTML = '<div class="symbol-suggestion-empty">Set a real Alpha Vantage API key to fetch live ticker matches.</div>';
        suggestionBox.classList.remove("hidden");
        return;
      }

      const requestUrl =
        ALPHA_VANTAGE_SEARCH_URL +
        "?function=SYMBOL_SEARCH&keywords=" + encodeURIComponent(queryText) +
        "&apikey=" + encodeURIComponent(apiKey);

      let response;
      try {
        response = await fetch(requestUrl);
      } catch (networkError) {
        response = null;
      }

      if (!response || !response.ok) {
        // Some browsers/CORS setups block direct Alpha Vantage calls; fallback through a public passthrough.
        const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(requestUrl);
        response = await fetch(proxyUrl);
      }

      if (!response.ok) {
        throw new Error("Ticker search request failed.");
      }

      const payload = await response.json();
      if (myToken !== activeSearchToken) {
        return;
      }

      const matches = Array.isArray(payload.bestMatches)
        ? payload.bestMatches
          .slice(0, 5)
          .map(function (item) {
            return {
              symbol: String(item["1. symbol"] || item.symbol || "").trim().toUpperCase(),
              name: String(item["2. name"] || item.name || "").trim()
            };
          })
          .filter(function (item) {
            return item.symbol;
          })
        : [];

      if (payload.Note || payload.Information || payload["Error Message"]) {
        throw new Error("Ticker API limit reached or unavailable.");
      }

      if (!matches.length) {
        suggestionBox.innerHTML = '<div class="symbol-suggestion-empty">No matching ticker found</div>';
        suggestionBox.classList.remove("hidden");
        return;
      }

      suggestionBox.innerHTML = matches
        .map(function (stock) {
          return (
            '<button type="button" class="symbol-suggestion-item" data-symbol="' + stock.symbol + '">' +
              "<strong>" + stock.symbol + "</strong><span>- " + stock.name + "</span>" +
            "</button>"
          );
        })
        .join("");

      suggestionBox.classList.remove("hidden");
    } catch (error) {
      suggestionBox.innerHTML = '<div class="symbol-suggestion-empty">Live search unavailable. Check API key/network and try again.</div>';
      suggestionBox.classList.remove("hidden");
    }
  }

  function hideStockSuggestions() {
    suggestionBox.classList.add("hidden");
  }

  suggestionBox.addEventListener("mousedown", function (event) {
    const selectedButton = event.target.closest(".symbol-suggestion-item");
    if (!selectedButton) {
      return;
    }

    event.preventDefault();
    symbolInput.value = selectedButton.getAttribute("data-symbol") || "";
    hideStockSuggestions();
  });

  refreshStockSearchState = function () {
    refreshPlaceholder();
    if (!isStockAssetTypeSelected()) {
      hideStockSuggestions();
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    }
  };

  refreshPlaceholder();
}

function initializeSellOwnedAssetSearch() {
  const assetTypeSelect = document.getElementById("sellAssetType");
  const symbolInput = document.getElementById("sellSymbol");
  const suggestionBox = document.getElementById("sellSymbolSuggestions");
  const container = document.getElementById("sellSymbolSearchContainer");
  const quantityInput = document.getElementById("sellQuantity");
  const availableQuantityInput = document.getElementById("sellAvailableQuantity");
  const averageBuyPriceInput = document.getElementById("sellAverageBuyPrice");

  if (!assetTypeSelect || !symbolInput || !suggestionBox || !container || !quantityInput || !availableQuantityInput || !averageBuyPriceInput) {
    return;
  }

  function normalizeAssetType(value) {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "STOCKS") {
      return "STOCK";
    }
    if (normalized === "BONDS") {
      return "BOND";
    }
    if (normalized === "COMMODITIES") {
      return "COMMODITY";
    }
    return normalized;
  }

  function stockNameForSymbol(symbol) {
    const found = availableStocks.find(function (item) {
      return item.symbol === symbol;
    });
    return found ? found.name : "";
  }

  function getOwnedAssets() {
    let rawItems = [];

    try {
      const stored = localStorage.getItem("investments");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          rawItems = parsed;
        }
      }
    } catch (error) {
      rawItems = [];
    }

    if (!rawItems.length && window.InvestIQStore && typeof window.InvestIQStore.getHoldings === "function") {
      rawItems = window.InvestIQStore.getHoldings();
    }

    const grouped = {};

    rawItems.forEach(function (item) {
      const symbol = String(item.symbol || "").trim().toUpperCase();
      const assetType = normalizeAssetType(item.assetType || item.type || "STOCK");
      const quantity = Number(item.quantity || item.shares || item.units || 0);
      const buyPrice = Number(item.buyPrice || item.purchasePrice || item.avgBuyPrice || item.averageBuyPrice || item.price || 0);

      if (!symbol || !Number.isFinite(quantity) || quantity <= 0) {
        return;
      }

      const key = assetType + "::" + symbol;
      if (!grouped[key]) {
        grouped[key] = {
          symbol: symbol,
          name: String(item.name || item.companyName || stockNameForSymbol(symbol) || ""),
          assetType: assetType,
          quantity: 0,
          totalCost: 0
        };
      }

      grouped[key].quantity += quantity;
      grouped[key].totalCost += quantity * (Number.isFinite(buyPrice) ? buyPrice : 0);
    });

    return Object.keys(grouped).map(function (key) {
      const row = grouped[key];
      return {
        symbol: row.symbol,
        name: row.name,
        assetType: row.assetType,
        quantity: row.quantity,
        averageBuyPrice: row.quantity > 0 ? row.totalCost / row.quantity : 0
      };
    });
  }

  function clearAutoFill() {
    availableQuantityInput.value = "";
    averageBuyPriceInput.value = "";
    quantityInput.removeAttribute("max");
  }

  function applySelection(asset) {
    symbolInput.value = asset.symbol;
    availableQuantityInput.value = String(asset.quantity);
    averageBuyPriceInput.value = window.InvestIQStore.formatCurrency(asset.averageBuyPrice);
    quantityInput.max = String(Math.floor(asset.quantity));

    const currentQty = Number(quantityInput.value || 0);
    if (currentQty > Number(quantityInput.max)) {
      quantityInput.value = quantityInput.max;
    }
  }

  function hideSuggestions() {
    suggestionBox.classList.add("hidden");
  }

  function renderSuggestions(searchText) {
    const selectedType = normalizeAssetType(assetTypeSelect.value);
    if (!selectedType) {
      hideSuggestions();
      return;
    }

    const query = String(searchText || "").trim().toLowerCase();
    const ownedAssets = getOwnedAssets().filter(function (asset) {
      if (selectedType && asset.assetType !== selectedType) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        asset.symbol.toLowerCase().indexOf(query) !== -1 ||
        asset.name.toLowerCase().indexOf(query) !== -1
      );
    });

    if (!ownedAssets.length) {
      suggestionBox.innerHTML = '<div class="symbol-suggestion-empty">No matching owned assets found</div>';
      suggestionBox.classList.remove("hidden");
      return;
    }

    suggestionBox.innerHTML = ownedAssets
      .slice(0, 10)
      .map(function (asset) {
        const label = asset.name ? " - " + asset.name : "";
        return (
          '<button type="button" class="symbol-suggestion-item" data-symbol="' + asset.symbol + '">' +
            "<strong>" + asset.symbol + "</strong><span>" + label + "</span>" +
            '<span class="owned-badge">' + Math.floor(asset.quantity) + ' Shares Owned</span>' +
          "</button>"
        );
      })
      .join("");

    suggestionBox.classList.remove("hidden");
  }

  function syncAutoFillFromTypedSymbol() {
    const selectedType = normalizeAssetType(assetTypeSelect.value);
    const typedSymbol = String(symbolInput.value || "").trim().toUpperCase();
    if (!selectedType || !typedSymbol) {
      clearAutoFill();
      return;
    }

    const matched = getOwnedAssets().find(function (asset) {
      return asset.assetType === selectedType && asset.symbol === typedSymbol;
    });

    if (matched) {
      applySelection(matched);
      return;
    }

    clearAutoFill();
  }

  assetTypeSelect.addEventListener("change", function () {
    symbolInput.value = "";
    clearAutoFill();
    hideSuggestions();
  });

  symbolInput.addEventListener("focus", function () {
    if (!String(symbolInput.value || "").trim()) {
      return;
    }
    renderSuggestions(symbolInput.value);
  });

  symbolInput.addEventListener("input", function () {
    const text = String(symbolInput.value || "");
    if (!text.trim()) {
      clearAutoFill();
      hideSuggestions();
      return;
    }

    syncAutoFillFromTypedSymbol();
    renderSuggestions(text);
  });

  symbolInput.addEventListener("blur", function () {
    setTimeout(hideSuggestions, 120);
  });

  suggestionBox.addEventListener("mousedown", function (event) {
    const button = event.target.closest(".symbol-suggestion-item");
    if (!button) {
      return;
    }

    event.preventDefault();
    const symbol = button.getAttribute("data-symbol") || "";
    const selectedType = normalizeAssetType(assetTypeSelect.value);
    const selectedAsset = getOwnedAssets().find(function (asset) {
      return asset.assetType === selectedType && asset.symbol === symbol;
    });

    if (selectedAsset) {
      applySelection(selectedAsset);
    }
    hideSuggestions();
  });

  quantityInput.addEventListener("input", function () {
    const max = Number(quantityInput.max || 0);
    const current = Number(quantityInput.value || 0);
    if (max > 0 && current > max) {
      quantityInput.value = String(max);
    }
  });

  document.addEventListener("click", function (event) {
    if (!container.contains(event.target)) {
      hideSuggestions();
    }
  });

  refreshSellOwnedAssetState = function () {
    clearAutoFill();
    hideSuggestions();
  };

  refreshSellOwnedAssetState();
}

function renderTransactions() {
  const body = document.getElementById("investmentTransactionsBody");
  if (!body) {
    return;
  }

  const transactions = window.InvestIQStore.getTransactions().slice(0, 10);
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

function applyInvestmentUrlParams() {
  const params = new URLSearchParams(window.location.search || "");
  const symbol = String(params.get("symbol") || "").trim().toUpperCase();
  const action = String(params.get("action") || "").trim().toLowerCase();
  const type = String(params.get("type") || "").trim().toUpperCase();

  if (!symbol || (action !== "buy" && action !== "sell")) {
    return;
  }

  if (action === "buy") {
    const assetTypeSelect = document.getElementById("buyAssetType");
    const symbolInput = document.getElementById("buySymbol");
    const buyForm = document.getElementById("buyForm");

    if (assetTypeSelect && type) {
      assetTypeSelect.value = type;
      assetTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (symbolInput) {
      symbolInput.value = symbol;
      symbolInput.focus();
      symbolInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (buyForm) {
      buyForm.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const sellAssetTypeSelect = document.getElementById("sellAssetType");
  const sellSymbolInput = document.getElementById("sellSymbol");
  const sellForm = document.getElementById("sellForm");

  if (sellAssetTypeSelect && type) {
    sellAssetTypeSelect.value = type;
    sellAssetTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (sellSymbolInput) {
    sellSymbolInput.value = symbol;
    sellSymbolInput.focus();
    sellSymbolInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  if (sellForm) {
    sellForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

