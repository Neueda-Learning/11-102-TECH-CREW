document.addEventListener("DOMContentLoaded", function () {
  if (!window.InvestIQStore || typeof Chart === "undefined") {
    return;
  }

  renderAllocationChart();
});

function renderAllocationChart() {
  const canvas = document.getElementById("allocationChart");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const data = window.InvestIQStore.getAllocationData();

  // Create subtle modern depth gradients for each slice
  const stockGradient = ctx.createLinearGradient(0, 0, 0, 300);
  stockGradient.addColorStop(0, "#3b82f6");
  stockGradient.addColorStop(1, "#1d4ed8");

  const bondGradient = ctx.createLinearGradient(0, 0, 0, 300);
  bondGradient.addColorStop(0, "#8b5cf6");
  bondGradient.addColorStop(1, "#6d28d9");

  const commodityGradient = ctx.createLinearGradient(0, 0, 0, 300);
  commodityGradient.addColorStop(0, "#f59e0b");
  commodityGradient.addColorStop(1, "#d97706");

  new Chart(canvas, {
    type: "doughnut", // Doughnut provides a cleaner modern look than a flat pie chart
    data: {
      labels: data.labels,
      datasets: [
        {
          data: data.values,
          backgroundColor: [stockGradient, bondGradient, commodityGradient],
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverOffset: 12
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%", // Donut inner cutout for sleek look
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: "circle",
            font: {
              size: 13,
              weight: "600",
              family: "'Plus Jakarta Sans', sans-serif"
            },
            color: "#334155"
          }
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleFont: { size: 14, weight: "700" },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = window.InvestIQStore.formatCurrency(context.parsed);
              return " " + label + ": " + value;
            }
          }
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  });
}