document.addEventListener("DOMContentLoaded", function () {
  if (!window.InvestIQStore) {
    return;
  }

  setDefaultDates();
  bindForms();
  renderTransactions();
});

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
        const result = window.InvestIQStore.sellInvestment({
          symbol: data.get("symbol"),
          quantity: data.get("quantity"),
          sellPrice: data.get("sellPrice"),
          date: data.get("date")
        });

        showStatus("sellStatus", result.message, "success");
        sellForm.reset();
        setDefaultDates();
        renderTransactions();
      } catch (error) {
        showStatus("sellStatus", error.message, "error");
      }
    });
  }
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

