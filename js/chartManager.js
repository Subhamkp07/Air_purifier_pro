// ============================================
// AIR MONITOR PRO — Chart Manager
// ============================================

const ChartManager = (() => {
  // Chart instances
  let realtimeChart = null;
  let trendChart = null;
  let weeklyChart = null;
  let correlationChart = null;

  // Chart.js global defaults for dark theme
  function setChartDefaults() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(100,140,255,0.06)';
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#f1f5f9';
    Chart.defaults.plugins.tooltip.bodyColor = '#94a3b8';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(100,140,255,0.15)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.animation = { duration: 600, easing: 'easeOutQuart' };
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
  }

  // Color palette for pollutants
  const COLORS = {
    pm25: { line: '#22d3ee', fill: 'rgba(34,211,238,0.1)' },
    pm10: { line: '#3b82f6', fill: 'rgba(59,130,246,0.1)' },
    co2: { line: '#8b5cf6', fill: 'rgba(139,92,246,0.1)' },
    voc: { line: '#ec4899', fill: 'rgba(236,72,153,0.1)' },
    temperature: { line: '#f97316', fill: 'rgba(249,115,22,0.1)' },
    humidity: { line: '#14b8a6', fill: 'rgba(20,184,166,0.1)' },
  };

  // Real-time data buffer (last 60 points)
  const REALTIME_BUFFER_SIZE = 60;
  let realtimeData = {
    labels: [],
    pm25: [],
    pm10: [],
    co2: [],
    voc: [],
  };

  // Which pollutants are visible on real-time chart
  let visiblePollutants = new Set(['pm25', 'pm10', 'co2', 'voc']);

  /**
   * Initialize all charts
   */
  function init() {
    setChartDefaults();
    createRealtimeChart();
    createTrendChart();
    createWeeklyChart();
    createCorrelationChart();
  }

  /**
   * Create the real-time streaming chart
   */
  function createRealtimeChart() {
    const ctx = document.getElementById('realtimeChart');
    if (!ctx) return;

    realtimeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          makeDataset('PM2.5', 'pm25'),
          makeDataset('PM10', 'pm10'),
          makeDataset('CO₂', 'co2', true),
          makeDataset('VOC', 'voc'),
        ]
      },
      options: {
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 10, font: { size: 10 } },
          },
          y: {
            grid: { color: 'rgba(100,140,255,0.04)' },
            beginAtZero: true,
            ticks: { font: { size: 10 } },
          },
          y1: {
            position: 'right',
            grid: { display: false },
            beginAtZero: true,
            ticks: { font: { size: 10 } },
            display: true,
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => items[0]?.label || '',
            }
          }
        },
        elements: {
          point: { radius: 0, hoverRadius: 4 },
          line: { tension: 0.35 },
        },
      }
    });
  }

  /**
   * Create dataset config
   */
  function makeDataset(label, key, useY1 = false) {
    const c = COLORS[key];
    return {
      label,
      data: [],
      borderColor: c.line,
      backgroundColor: c.fill,
      borderWidth: 2,
      fill: true,
      yAxisID: useY1 ? 'y1' : 'y',
      hidden: !visiblePollutants.has(key),
    };
  }

  /**
   * Add real-time data point
   */
  function addRealtimePoint(reading) {
    const label = Utils.formatTimeShort(reading.timestamp);

    realtimeData.labels.push(label);
    realtimeData.pm25.push(reading.pm25);
    realtimeData.pm10.push(reading.pm10);
    realtimeData.co2.push(reading.co2);
    realtimeData.voc.push(reading.voc);

    // Trim buffer
    if (realtimeData.labels.length > REALTIME_BUFFER_SIZE) {
      realtimeData.labels.shift();
      realtimeData.pm25.shift();
      realtimeData.pm10.shift();
      realtimeData.co2.shift();
      realtimeData.voc.shift();
    }

    if (realtimeChart) {
      realtimeChart.data.labels = [...realtimeData.labels];
      realtimeChart.data.datasets[0].data = [...realtimeData.pm25];
      realtimeChart.data.datasets[1].data = [...realtimeData.pm10];
      realtimeChart.data.datasets[2].data = [...realtimeData.co2];
      realtimeChart.data.datasets[3].data = [...realtimeData.voc];
      realtimeChart.update('none');
    }
  }

  /**
   * Toggle pollutant visibility
   */
  function togglePollutant(key) {
    if (visiblePollutants.has(key)) {
      visiblePollutants.delete(key);
    } else {
      visiblePollutants.add(key);
    }
    if (realtimeChart) {
      const idx = ['pm25', 'pm10', 'co2', 'voc'].indexOf(key);
      if (idx >= 0) {
        realtimeChart.data.datasets[idx].hidden = !visiblePollutants.has(key);
        realtimeChart.update();
      }
    }
  }

  /**
   * Check if pollutant is visible
   */
  function isPollutantVisible(key) {
    return visiblePollutants.has(key);
  }

  /**
   * Create 24h trend chart
   */
  function createTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'PM2.5',
            data: [],
            borderColor: COLORS.pm25.line,
            backgroundColor: createGradient(ctx, COLORS.pm25.line),
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'AQI',
            data: [],
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y1',
          }
        ]
      },
      options: {
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 12, font: { size: 10 } },
          },
          y: {
            grid: { color: 'rgba(100,140,255,0.04)' },
            beginAtZero: true,
            title: { display: true, text: 'PM2.5 (μg/m³)', font: { size: 10 } },
          },
          y1: {
            position: 'right',
            grid: { display: false },
            beginAtZero: true,
            title: { display: true, text: 'AQI', font: { size: 10 } },
          }
        },
        interaction: { mode: 'index', intersect: false },
        elements: { point: { radius: 0 } },
      }
    });
  }

  /**
   * Update 24h trend chart with historical data
   */
  function updateTrendChart() {
    if (!trendChart) return;

    const history = SensorSimulator.getHistory(24);
    const labels = history.map(d => Utils.formatTimeShort(d.timestamp));
    const pm25Data = history.map(d => d.pm25);
    const aqiData = history.map(d => AQIEngine.calculate(d).aqi);

    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = pm25Data;
    trendChart.data.datasets[1].data = aqiData;
    trendChart.update('none');
  }

  /**
   * Create weekly bar chart
   */
  function createWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;

    weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Avg PM2.5',
            data: [],
            backgroundColor: 'rgba(34,211,238,0.6)',
            borderColor: '#22d3ee',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6,
          },
          {
            label: 'Avg PM10',
            data: [],
            backgroundColor: 'rgba(59,130,246,0.6)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6,
          },
          {
            label: 'Avg AQI',
            data: [],
            type: 'line',
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#f59e0b',
            yAxisID: 'y1',
          }
        ]
      },
      options: {
        plugins: {
          legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 15 } },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: 'rgba(100,140,255,0.04)' },
            beginAtZero: true,
            title: { display: true, text: 'Concentration', font: { size: 10 } },
          },
          y1: {
            position: 'right',
            grid: { display: false },
            beginAtZero: true,
            title: { display: true, text: 'AQI', font: { size: 10 } },
          }
        },
      }
    });
  }

  /**
   * Update weekly chart
   */
  function updateWeeklyChart() {
    if (!weeklyChart) return;

    const allHistory = SensorSimulator.getAllHistory();
    const dailyBuckets = {};

    allHistory.forEach(d => {
      const dayKey = d.timestamp.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!dailyBuckets[dayKey]) {
        dailyBuckets[dayKey] = { pm25: [], pm10: [], aqi: [] };
      }
      dailyBuckets[dayKey].pm25.push(d.pm25);
      dailyBuckets[dayKey].pm10.push(d.pm10);
      dailyBuckets[dayKey].aqi.push(AQIEngine.calculate(d).aqi);
    });

    const labels = Object.keys(dailyBuckets).slice(-7);
    const pm25Avg = labels.map(l => Utils.mean(dailyBuckets[l].pm25));
    const pm10Avg = labels.map(l => Utils.mean(dailyBuckets[l].pm10));
    const aqiAvg = labels.map(l => Utils.mean(dailyBuckets[l].aqi));

    weeklyChart.data.labels = labels;
    weeklyChart.data.datasets[0].data = pm25Avg;
    weeklyChart.data.datasets[1].data = pm10Avg;
    weeklyChart.data.datasets[2].data = aqiAvg;
    weeklyChart.update('none');
  }

  /**
   * Create correlation scatter chart
   */
  function createCorrelationChart() {
    const ctx = document.getElementById('correlationChart');
    if (!ctx) return;

    correlationChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'PM2.5 vs Humidity',
            data: [],
            backgroundColor: 'rgba(34,211,238,0.4)',
            borderColor: '#22d3ee',
            borderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
          {
            label: 'VOC vs Temperature',
            data: [],
            backgroundColor: 'rgba(236,72,153,0.4)',
            borderColor: '#ec4899',
            borderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 6,
          }
        ]
      },
      options: {
        plugins: {
          legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 15 } },
          tooltip: {
            callbacks: {
              label: (ctx) => `(${ctx.parsed.x.toFixed(1)}, ${ctx.parsed.y.toFixed(1)})`,
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(100,140,255,0.04)' },
            title: { display: true, text: 'Humidity (%) / Temperature (°C)', font: { size: 10 } },
          },
          y: {
            grid: { color: 'rgba(100,140,255,0.04)' },
            title: { display: true, text: 'PM2.5 (μg/m³) / VOC (ppb)', font: { size: 10 } },
          }
        },
      }
    });
  }

  /**
   * Update correlation chart
   */
  function updateCorrelationChart() {
    if (!correlationChart) return;

    const history = SensorSimulator.getHistory(24);
    // Sample max 200 points for performance
    const step = Math.max(1, Math.floor(history.length / 200));

    const pmHumidity = [];
    const vocTemp = [];

    for (let i = 0; i < history.length; i += step) {
      const d = history[i];
      pmHumidity.push({ x: d.humidity, y: d.pm25 });
      vocTemp.push({ x: d.temperature, y: d.voc });
    }

    correlationChart.data.datasets[0].data = pmHumidity;
    correlationChart.data.datasets[1].data = vocTemp;
    correlationChart.update('none');
  }

  /**
   * Create gradient fill for chart
   */
  function createGradient(ctx, color) {
    const canvas = ctx instanceof HTMLCanvasElement ? ctx : ctx.canvas;
    if (!canvas) return color;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height || 300);
    gradient.addColorStop(0, color.replace(')', ',0.2)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, color.replace(')', ',0.0)').replace('rgb', 'rgba'));
    return gradient;
  }

  /**
   * Update all non-realtime charts
   */
  function updateAllCharts() {
    updateTrendChart();
    updateWeeklyChart();
    updateCorrelationChart();
  }

  /**
   * Reset real-time data buffer
   */
  function resetRealtimeData() {
    realtimeData = {
      labels: [],
      pm25: [],
      pm10: [],
      co2: [],
      voc: [],
    };
    if (realtimeChart) {
      realtimeChart.data.labels = [];
      realtimeChart.data.datasets.forEach(ds => ds.data = []);
      realtimeChart.update('none');
    }
  }

  /**
   * Destroy all charts (for cleanup)
   */
  function destroy() {
    [realtimeChart, trendChart, weeklyChart, correlationChart].forEach(c => {
      if (c) c.destroy();
    });
  }

  return {
    COLORS,
    init,
    addRealtimePoint,
    togglePollutant,
    isPollutantVisible,
    updateTrendChart,
    updateWeeklyChart,
    updateCorrelationChart,
    updateAllCharts,
    resetRealtimeData,
    destroy,
  };
})();
