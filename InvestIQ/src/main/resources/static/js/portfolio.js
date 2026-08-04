document.addEventListener("DOMContentLoaded", function () {
  if (!window.InvestIQStore) {
    return;
  }

  renderPortfolioPage();
});

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
      "<tr>" +
      "<td>" + holding.symbol + "</td>" +
      "<td>" + holding.assetLabel + "</td>" +
      "<td>" + window.InvestIQStore.formatNumber(holding.quantity) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(holding.buyPrice) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(holding.currentPrice) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(holding.currentValue) + "</td>" +
      "<td class=\"" + getProfitClass(holding.profit) + "\">" + window.InvestIQStore.formatCurrency(holding.profit) + "</td>" +
      "</tr>";
  });
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

