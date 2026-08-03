document.addEventListener("DOMContentLoaded", function () {
  loadDashboard();
});

function loadDashboard() {
  // Temp data for static dashboard preview
  document.getElementById("investmentValue").innerText = "50,000";
  document.getElementById("currentValue").innerText = "65,000";
  document.getElementById("profitValue").innerText = "15,000";
  document.getElementById("totalAssets").innerText = "5";

  loadPortfolioTable();
}

function loadPortfolioTable() {
let investments=[
 {
 symbol: "AAPL",
 quantity: 10,
 buyPrice: 150,
 currentPrice: 170
 },
 {
 symbol: "GOOGL",
    quantity: 5,
    buyPrice: 1000,
    currentPrice: 1200
  },
  {
    symbol: "AMZN",
    quantity: 2,
    buyPrice: 2000,
    currentPrice: 2500
}];

let table = document.getElementById("portfolioBody");
table.innerHTML = "";
investments.forEach(function(item){

let profit=(item.currentPrice - item.buyPrice)* item.quantity;

table.innerHTML +=
`<tr>
<td>${item.symbol}</td>
<td>${item.quantity}</td>
<td>${item.buyPrice}</td>
<td>${item.currentPrice}</td>
<td>${profit}</td>
</tr>
`;


});
}

function browsePortfolio(){
window.location.href="/portfolio.html";
}

function addInvestment(){
window.location.href="/addInvestment.html";
}

function viewPerformance(){
window.location.href="/performance.html";
}
