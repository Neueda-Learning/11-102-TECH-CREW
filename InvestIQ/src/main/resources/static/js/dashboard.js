document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("allocationChart");

  if (!canvas || typeof Chart === "undefined" || !window.InvestIQStore) {
    return;
  }

  const allocation = window.InvestIQStore.getAllocationData();
  const hasAssets = allocation.values.some(function (value) {
    return value > 0;
  });

  new Chart(canvas, {
    type: "pie",
    data: {
      labels: hasAssets ? allocation.labels : ["No Assets Yet"],
      datasets: [{
        data: hasAssets ? allocation.values : [1],
        backgroundColor: hasAssets
          ? [
              "rgba(255, 99, 132, 0.6)",
              "rgba(54, 162, 235, 0.6)",
              "rgba(255, 206, 86, 0.6)"
            ]
          : ["rgba(148, 163, 184, 0.5)"],
        borderColor: hasAssets
          ? [
              "rgba(255, 99, 132, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(255, 206, 86, 1)"
            ]
          : ["rgba(148, 163, 184, 1)"],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
});
