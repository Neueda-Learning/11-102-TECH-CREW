document.addEventListener("DOMContentLoaded", function () {
  if (!window.InvestIQStore) {
    return;
  }

  loadDashboard();
});

function loadDashboard() {
  const summary = window.InvestIQStore.getSummary();

  setText("investmentValue", window.InvestIQStore.formatCurrency(summary.totalInvested));
  setText("currentValue", window.InvestIQStore.formatCurrency(summary.currentValue));
  setText("profitValue", window.InvestIQStore.formatCurrency(summary.totalProfit));
  setText("totalAssets", window.InvestIQStore.formatNumber(summary.totalAssets));

  loadPortfolioTable();
}

function loadPortfolioTable() {
  const table = document.getElementById("portfolioBody");
  if (!table) {
    return;
  }

  const investments = window.InvestIQStore.getHoldings();
  table.innerHTML = "";

  if (!investments.length) {
    table.innerHTML = '<tr><td colspan="5">No holdings yet. Use the Investments page to add a trade.</td></tr>';
    return;
  }

  investments.forEach(function (item) {
    table.innerHTML +=
      "<tr>" +
      "<td>" + item.symbol + "</td>" +
      "<td>" + window.InvestIQStore.formatNumber(item.quantity) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(item.buyPrice) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(item.currentPrice) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(item.profit) + "</td>" +
      "</tr>";
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.innerText = value;
  }
}

function browsePortfolio() {
  window.location.href = "portfolio.html";
}

function addInvestment() {
  window.location.href = "investment.html";
}

function viewPerformance() {
  window.location.href = "performance.html";
}
