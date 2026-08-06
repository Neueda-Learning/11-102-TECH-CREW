(function () {
  const STORAGE_KEY = "investiq-portfolio-data";

  const seedData = {
    holdings: [
      {
        symbol: "AAPL",
        assetType: "STOCK",
        quantity: 10,
        buyPrice: 150,
        currentPrice: 170
      },
      {
        symbol: "UST10Y",
        assetType: "BOND",
        quantity: 8,
        buyPrice: 98,
        currentPrice: 102
      },
      {
        symbol: "GOLD",
        assetType: "COMMODITY",
        quantity: 4,
        buyPrice: 1800,
        currentPrice: 1925
      }
    ],
    transactions: [
      {
        id: 1,
        action: "BUY",
        symbol: "AAPL",
        assetType: "STOCK",
        quantity: 10,
        price: 150,
        date: "2026-07-15"
      },
      {
        id: 2,
        action: "BUY",
        symbol: "UST10Y",
        assetType: "BOND",
        quantity: 8,
        price: 98,
        date: "2026-07-10"
      },
      {
        id: 3,
        action: "BUY",
        symbol: "GOLD",
        assetType: "COMMODITY",
        quantity: 4,
        price: 1800,
        date: "2026-07-01"
      }
    ]
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizeAssetType(assetType) {
    return String(assetType || "").trim().toUpperCase();
  }

  function titleCaseAssetType(assetType) {
    const normalized = normalizeAssetType(assetType);
    if (normalized === "STOCK") {
      return "Stock";
    }
    if (normalized === "BOND") {
      return "Bond";
    }
    if (normalized === "COMMODITY") {
      return "Commodity";
    }
    return normalized || "Unknown";
  }

  function getDefaultDate() {
    return new Date().toISOString().split("T")[0];
  }

  function ensureDataShape(data) {
    if (!data || typeof data !== "object") {
      return clone(seedData);
    }

    return {
      holdings: Array.isArray(data.holdings) ? data.holdings : [],
      transactions: Array.isArray(data.transactions) ? data.transactions : []
    };
  }

  function getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = clone(seedData);
        saveData(initial);
        return initial;
      }

      return ensureDataShape(JSON.parse(raw));
    } catch (error) {
      const fallback = clone(seedData);
      saveData(fallback);
      return fallback;
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getHoldings() {
    return getData().holdings
      .map(function (holding) {
        const quantity = toNumber(holding.quantity);
        const buyPrice = toNumber(holding.buyPrice);
        const currentPrice = toNumber(holding.currentPrice);
        const invested = quantity * buyPrice;
        const currentValue = quantity * currentPrice;

        return {
          symbol: String(holding.symbol || "").trim().toUpperCase(),
          assetType: normalizeAssetType(holding.assetType),
          assetLabel: titleCaseAssetType(holding.assetType),
          quantity: quantity,
          buyPrice: buyPrice,
          currentPrice: currentPrice,
          invested: invested,
          currentValue: currentValue,
          profit: currentValue - invested
        };
      })
      .sort(function (left, right) {
        return left.symbol.localeCompare(right.symbol);
      });
  }

  function getTransactions() {
    return getData().transactions
      .map(function (transaction) {
        return {
          id: transaction.id,
          action: String(transaction.action || "").toUpperCase(),
          symbol: String(transaction.symbol || "").trim().toUpperCase(),
          assetType: normalizeAssetType(transaction.assetType),
          assetLabel: titleCaseAssetType(transaction.assetType),
          quantity: toNumber(transaction.quantity),
          price: toNumber(transaction.price),
          date: transaction.date || getDefaultDate()
        };
      })
      .sort(function (left, right) {
        return right.date.localeCompare(left.date);
      });
  }

  function getSummary() {
    return getHoldings().reduce(
      function (summary, holding) {
        summary.totalInvested += holding.invested;
        summary.currentValue += holding.currentValue;
        summary.totalProfit += holding.profit;
        summary.totalAssets += 1;
        return summary;
      },
      {
        totalInvested: 0,
        currentValue: 0,
        totalProfit: 0,
        totalAssets: 0
      }
    );
  }

  function getAllocationData() {
    const totals = {
      STOCK: 0,
      BOND: 0,
      COMMODITY: 0
    };

    getHoldings().forEach(function (holding) {
      totals[holding.assetType] += holding.currentValue;
    });

    return {
      labels: ["Stocks", "Bonds", "Commodities"],
      values: [totals.STOCK, totals.BOND, totals.COMMODITY]
    };
  }

  function validateRequiredText(value, fieldName) {
    if (!String(value || "").trim()) {
      throw new Error(fieldName + " is required.");
    }
  }

  function validatePositiveNumber(value, fieldName) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error(fieldName + " must be greater than 0.");
    }
    return number;
  }

  function buyInvestment(input) {
    validateRequiredText(input.symbol, "Symbol");
    validateRequiredText(input.assetType, "Asset type");

    const assetType = normalizeAssetType(input.assetType);
    if (["STOCK", "BOND", "COMMODITY"].indexOf(assetType) === -1) {
      throw new Error("Asset type must be STOCK, BOND, or COMMODITY.");
    }

    const symbol = String(input.symbol).trim().toUpperCase();
    const quantity = validatePositiveNumber(input.quantity, "Quantity");
    const buyPrice = validatePositiveNumber(input.buyPrice, "Buy price");
    const currentPrice = validatePositiveNumber(input.currentPrice || input.buyPrice, "Current price");
    const date = input.date || getDefaultDate();

    const data = getData();
    const existingHolding = data.holdings.find(function (holding) {
      return String(holding.symbol).toUpperCase() === symbol && normalizeAssetType(holding.assetType) === assetType;
    });

    if (existingHolding) {
      const existingQuantity = toNumber(existingHolding.quantity);
      const updatedQuantity = existingQuantity + quantity;
      existingHolding.buyPrice = ((existingQuantity * toNumber(existingHolding.buyPrice)) + (quantity * buyPrice)) / updatedQuantity;
      existingHolding.quantity = updatedQuantity;
      existingHolding.currentPrice = currentPrice;
    } else {
      data.holdings.push({
        symbol: symbol,
        assetType: assetType,
        quantity: quantity,
        buyPrice: buyPrice,
        currentPrice: currentPrice
      });
    }

    data.transactions.unshift({
      id: Date.now(),
      action: "BUY",
      symbol: symbol,
      assetType: assetType,
      quantity: quantity,
      price: buyPrice,
      date: date
    });

    saveData(data);
    return {
      message: symbol + " added to your portfolio.",
      holdings: getHoldings(),
      summary: getSummary(),
      transactions: getTransactions()
    };
  }

  function sellInvestment(input) {
    validateRequiredText(input.symbol, "Symbol");

    const symbol = String(input.symbol).trim().toUpperCase();
    const quantity = validatePositiveNumber(input.quantity, "Quantity");
    const sellPrice = validatePositiveNumber(input.sellPrice, "Sell price");
    const date = input.date || getDefaultDate();
    const data = getData();

    const holdingIndex = data.holdings.findIndex(function (holding) {
      return String(holding.symbol).toUpperCase() === symbol;
    });

    if (holdingIndex === -1) {
      throw new Error("No holding found for symbol " + symbol + ".");
    }

    const holding = data.holdings[holdingIndex];
    const currentQuantity = toNumber(holding.quantity);
    if (quantity > currentQuantity) {
      throw new Error("Cannot sell more than the current quantity for " + symbol + ".");
    }

    holding.quantity = currentQuantity - quantity;
    holding.currentPrice = sellPrice;

    if (holding.quantity === 0) {
      data.holdings.splice(holdingIndex, 1);
    }

    data.transactions.unshift({
      id: Date.now(),
      action: "SELL",
      symbol: symbol,
      assetType: normalizeAssetType(holding.assetType),
      quantity: quantity,
      price: sellPrice,
      date: date
    });

    saveData(data);
    return {
      message: symbol + " sale recorded successfully.",
      holdings: getHoldings(),
      summary: getSummary(),
      transactions: getTransactions()
    };
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(toNumber(value));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-IN").format(toNumber(value));
  }

  function resetData() {
    const initial = clone(seedData);
    saveData(initial);
    return initial;
  }

  window.InvestIQStore = {
    getData: getData,
    getHoldings: getHoldings,
    getTransactions: getTransactions,
    getSummary: getSummary,
    getAllocationData: getAllocationData,
    buyInvestment: buyInvestment,
    sellInvestment: sellInvestment,
    formatCurrency: formatCurrency,
    formatNumber: formatNumber,
    getDefaultDate: getDefaultDate,
    titleCaseAssetType: titleCaseAssetType,
    resetData: resetData
  };
})();


