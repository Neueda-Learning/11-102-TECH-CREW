document.addEventListener("DOMContentLoaded", function () {
  if (!window.InvestIQStore || typeof Chart === "undefined") {
    return;
  }

  renderPerformancePage();
});

function renderPerformancePage() {
  const holdings = window.InvestIQStore.getHoldings();
  const summary = window.InvestIQStore.getSummary();

  setText("performanceInvested", window.InvestIQStore.formatCurrency(summary.totalInvested));
  setText("performanceCurrent", window.InvestIQStore.formatCurrency(summary.currentValue));
  setText("performanceProfit", window.InvestIQStore.formatCurrency(summary.totalProfit));
  setText("bestPerformer", getBestPerformerLabel(holdings));

  renderPerformanceTable(holdings);
  renderOverviewChart(summary);
  renderAssetPerformanceChart(holdings);
}

function renderPerformanceTable(holdings) {
  const body = document.getElementById("performanceTableBody");
  if (!body) {
    return;
  }

  body.innerHTML = "";
  if (!holdings.length) {
    body.innerHTML = '<tr><td colspan="5">No holdings available. Add investments to view performance.</td></tr>';
    return;
  }

  holdings.forEach(function (holding) {
    body.innerHTML +=
      "<tr>" +
      "<td>" + holding.symbol + "</td>" +
      "<td>" + holding.assetLabel + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(holding.invested) + "</td>" +
      "<td>" + window.InvestIQStore.formatCurrency(holding.currentValue) + "</td>" +
      "<td class=\"" + getProfitClass(holding.profit) + "\">" + window.InvestIQStore.formatCurrency(holding.profit) + "</td>" +
      "</tr>";
  });
}

function renderOverviewChart(summary) {
  const canvas = document.getElementById("profitLossChart");
  if (!canvas) {
    return;
  }

  const labels = ["Total Investment", "Current Value", "Profit / Loss"];
  const values = [summary.totalInvested, summary.currentValue, summary.totalProfit];
  const backgroundColors = [
    "rgba(59, 130, 246, 0.65)",
    "rgba(168, 85, 247, 0.65)",
    summary.totalProfit >= 0 ? "rgba(34, 197, 94, 0.65)" : "rgba(239, 68, 68, 0.65)"
  ];
  const borderColors = [
    "rgba(59, 130, 246, 1)",
    "rgba(168, 85, 247, 1)",
    summary.totalProfit >= 0 ? "rgba(34, 197, 94, 1)" : "rgba(239, 68, 68, 1)"
  ];

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Portfolio Overview",
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return window.InvestIQStore.formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return window.InvestIQStore.formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

function renderAssetPerformanceChart(holdings) {
  const canvas = document.getElementById("valueComparisonChart");
  if (!canvas) {
    return;
  }

  const labels = holdings.length ? holdings.map(function (holding) { return holding.symbol; }) : ["No data"];
  const profits = holdings.length ? holdings.map(function (holding) { return holding.profit; }) : [0];
  const colors = profits.map(function (value) {
    return value >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)";
  });
  const borderColors = colors.map(function (color) {
    return color.replace("0.7", "1");
  });

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Profit / Loss by Asset",
        data: profits,
        backgroundColor: borderColors.length ? colors : ["rgba(148, 163, 184, 0.7)"],
        borderColor: borderColors.length ? borderColors : ["rgba(148, 163, 184, 1)"],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: function (context) {
              if (!holdings.length) {
                return "Add investments to see asset performance.";
              }

              const holding = holdings[context.dataIndex];
              return [
                "Type: " + holding.assetLabel,
                "Invested: " + window.InvestIQStore.formatCurrency(holding.invested),
                "Current Value: " + window.InvestIQStore.formatCurrency(holding.currentValue),
                "Profit / Loss: " + window.InvestIQStore.formatCurrency(holding.profit)
              ];
            },
            label: function (context) {
              return "Performance: " + window.InvestIQStore.formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return window.InvestIQStore.formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

function getBestPerformerLabel(holdings) {
  if (!holdings.length) {
    return "No holdings";
  }

  const best = holdings.reduce(function (currentBest, holding) {
    return holding.profit > currentBest.profit ? holding : currentBest;
  }, holdings[0]);

  return best.symbol + " (" + window.InvestIQStore.formatCurrency(best.profit) + ")";
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


