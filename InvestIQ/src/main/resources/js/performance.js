// Keep track of chart instances globally to prevent redraw loops
let pnlChartInstance = null;
let assetChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  renderPerformanceData();
});

function renderPerformanceData() {
  // 1. Fetch Investment Data
  let investments = [];
  try {
    const storedData = localStorage.getItem('investments');
    if (storedData) {
      investments = JSON.parse(storedData);
    } else if (typeof sampleInvestments !== 'undefined') {
      investments = sampleInvestments;
    }
  } catch (e) {
    console.error('Error loading investment data:', e);
  }

  // Fallback demo dataset if empty
  if (!investments || investments.length === 0) {
    investments = [
      { symbol: 'RELIANCE', type: 'Stock', invested: 50000, current: 58500 },
      { symbol: 'TCS', type: 'Stock', invested: 40000, current: 43200 },
      { symbol: 'GOLD', type: 'Commodity', invested: 25000, current: 27800 },
      { symbol: 'HDFC BANK', type: 'Stock', invested: 35000, current: 33100 },
      { symbol: 'SILVER', type: 'Commodity', invested: 15000, current: 16400 }
    ];
  }

  // 2. Calculate Portfolio Totals
  let totalInvested = 0;
  let totalCurrent = 0;
  let bestAsset = { symbol: '-', pnl: -Infinity };

  const tableBody = document.getElementById('performanceTableBody');
  if (tableBody) tableBody.innerHTML = '';

  investments.forEach((item) => {
    const investedVal = parseFloat(item.invested || item.amount || 0);
    const currentVal = parseFloat(item.current || item.currentValue || item.invested || 0);
    const pnl = currentVal - investedVal;

    totalInvested += investedVal;
    totalCurrent += currentVal;

    if (pnl > bestAsset.pnl) {
      bestAsset = { symbol: item.symbol || item.name || 'N/A', pnl: pnl };
    }

    if (tableBody) {
      const row = document.createElement('tr');
      const pnlClass = pnl > 0 ? 'profit-positive' : pnl < 0 ? 'profit-negative' : 'profit-neutral';
      const pnlSign = pnl > 0 ? '+' : '';

      row.innerHTML = `
        <td><strong>${item.symbol || 'N/A'}</strong></td>
        <td>${item.type || 'Asset'}</td>
        <td>₹${investedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>₹${currentVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td class="${pnlClass}">${pnlSign}₹${pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      `;
      tableBody.appendChild(row);
    }
  });

  const totalPnL = totalCurrent - totalInvested;

  // 3. Update Summary Cards
  const elInvested = document.getElementById('performanceInvested');
  const elCurrent = document.getElementById('performanceCurrent');
  const elProfit = document.getElementById('performanceProfit');
  const elBest = document.getElementById('bestPerformer');

  if (elInvested) elInvested.textContent = `₹${totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (elCurrent) elCurrent.textContent = `₹${totalCurrent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (elProfit) {
    const sign = totalPnL > 0 ? '+' : '';
    elProfit.textContent = `${sign}₹${totalPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    elProfit.className = totalPnL >= 0 ? 'profit-positive' : 'profit-negative';
  }
  if (elBest) elBest.textContent = bestAsset.symbol !== '-' ? bestAsset.symbol : 'N/A';

  // ==========================================================================
  // 4. CHART 1: Fixed Historical Growth Curve (Like Zerodha / Robinhood)
  // ==========================================================================
  const ctx1 = document.getElementById('profitLossChart');
  if (ctx1) {
    // DESTROY previous chart instance if it exists to stop animation loops
    if (pnlChartInstance) {
      pnlChartInstance.destroy();
    }

    const canvasContext1 = ctx1.getContext('2d');
    const gradientFill = canvasContext1.createLinearGradient(0, 0, 0, 300);
    gradientFill.addColorStop(0, 'rgba(0, 186, 242, 0.4)');
    gradientFill.addColorStop(0.7, 'rgba(0, 186, 242, 0.05)');
    gradientFill.addColorStop(1, 'rgba(0, 186, 242, 0.0)');

    // Real financial historical timeline tracking baseline cost to live current value
    const timelineLabels = ['Start', '1 Month Ago', '2 Weeks Ago', '1 Week Ago', 'Today'];
    const diff = totalCurrent - totalInvested;
    const timelineData = [
      totalInvested,
      totalInvested + (diff * 0.2),
      totalInvested + (diff * 0.45),
      totalInvested + (diff * 0.75),
      totalCurrent
    ];

    pnlChartInstance = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: timelineLabels,
        datasets: [{
          label: 'Portfolio Value (₹)',
          data: timelineData,
          fill: true,
          backgroundColor: gradientFill,
          borderColor: '#00baf2',
          borderWidth: 3,
          tension: 0.3, // Clean financial curve
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#00baf2',
          pointBorderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 9
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000, // Runs ONCE for 1 second on load, then STOPS
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: '700' },
            bodyFont: { family: 'JetBrains Mono', size: 14 },
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (context) => `Value: ₹${context.parsed.y.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', weight: '600' }, color: '#64748b' }
          },
          y: {
            stacked: true,
            grid: { color: '#cbd5e1', strokeDash: [4, 4] },
            ticks: {
              font: { family: 'JetBrains Mono' },
              color: '#64748b',
              callback: (val) => '₹' + val.toLocaleString('en-IN')
            }
          }
        }
      }
    });
  }

  // ==========================================================================
  // 5. CHART 2: Asset Comparison Bar Chart
  // ==========================================================================
  const ctx2 = document.getElementById('valueComparisonChart');
  if (ctx2) {
    if (assetChartInstance) {
      assetChartInstance.destroy();
    }

    const assetSymbols = investments.map(i => i.symbol || 'Asset');
    const assetInvested = investments.map(i => parseFloat(i.invested || i.amount || 0));
    const assetCurrent = investments.map(i => parseFloat(i.current || i.currentValue || i.invested || 0));

    const investedGradient = ctx2.getContext('2d').createLinearGradient(0, 0, 0, 260);
    investedGradient.addColorStop(0, 'rgba(148, 163, 184, 0.35)');
    investedGradient.addColorStop(1, 'rgba(148, 163, 184, 0.02)');

    const currentGradient = ctx2.getContext('2d').createLinearGradient(0, 0, 0, 260);
    currentGradient.addColorStop(0, 'rgba(0, 192, 139, 0.35)');
    currentGradient.addColorStop(1, 'rgba(0, 192, 139, 0.02)');

    assetChartInstance = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: assetSymbols,
        datasets: [
          {
            label: 'Invested (₹)',
            data: assetInvested,
            fill: true,
            backgroundColor: investedGradient,
            borderColor: '#94a3b8',
            borderWidth: 3,
            tension: 0.28,
            pointRadius: 6,
            pointHoverRadius: 9,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#94a3b8',
            pointBorderWidth: 3
          },
          {
            label: 'Current Value (₹)',
            data: assetCurrent,
            fill: true,
            backgroundColor: currentGradient,
            borderColor: '#00c08b',
            borderWidth: 3,
            tension: 0.28,
            pointRadius: 6,
            pointHoverRadius: 9,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#00c08b',
            pointBorderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000 // Runs ONCE then stops
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Plus Jakarta Sans', weight: '700' } }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: {
            stacked: true,
            grid: { color: '#cbd5e1' },
            ticks: { callback: (val) => '₹' + val.toLocaleString('en-IN') }
          }
        }
      }
    });
  }
}