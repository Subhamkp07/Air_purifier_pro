// ============================================
// AIR MONITOR PRO — Main Application
// ============================================

const App = (() => {
  let updateInterval = null;
  let clockInterval = null;
  let chartUpdateInterval = null;
  const UPDATE_MS = 2000; // Dashboard refresh every 2 seconds
  let lastReading = null;
  let lastAQI = null;

  /**
   * Initialize the entire application
   */
  function init() {
    // Initialize modules
    SensorSimulator.init();
    AlertManager.init();
    AlertManager.requestPermission();

    // Setup UI
    buildLocationSelector();
    setupEventListeners();
    startClock();

    // Auto-detect user location via GPS
    detectGeoLocation();

    // Initialize charts after DOM is ready
    ChartManager.init();

    // Register alert callback
    AlertManager.onAlert(handleNewAlert);

    // First reading
    updateDashboard();

    // Update non-realtime charts with historical data
    ChartManager.updateAllCharts();
    updateStatsPanel();

    // Start real-time updates
    startUpdates();

    // Periodic chart updates (every 30 seconds for trend/weekly/correlation)
    chartUpdateInterval = setInterval(() => {
      ChartManager.updateAllCharts();
      updateStatsPanel();
    }, 30000);

    // Render existing alerts
    renderAlertList();

    // Add entrance animations
    document.querySelectorAll('.metric-card').forEach((card, i) => {
      card.style.animationDelay = `${i * 0.08}s`;
      card.classList.add('animate-fade-in-up');
    });

    console.log('🌬️ Air Monitor Pro initialized');
  }

  /**
   * Start real-time sensor updates
   */
  function startUpdates() {
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateDashboard, UPDATE_MS);
  }

  /**
   * Update the dashboard with a new reading
   * Uses city-specific baseline data with natural variation
   */
  function updateDashboard() {
    const reading = SensorSimulator.getReading();
    const aqiResult = AQIEngine.calculate(reading);
    lastReading = reading;
    lastAQI = aqiResult;

    // Update metric cards
    updateMetricCards(reading);

    // Update AQI gauge
    updateAQIGauge(aqiResult);

    // Update real-time chart
    ChartManager.addRealtimePoint(reading);

    // Check alerts
    AlertManager.checkReading(reading);

    // Update health recommendations
    updateHealthRecommendations(aqiResult);
  }

  /**
   * Update individual metric cards
   */
  function updateMetricCards(reading) {
    const history = SensorSimulator.getHistory(1);
    const keys = ['pm25', 'pm10', 'co2', 'voc', 'temperature', 'humidity'];

    keys.forEach(key => {
      const el = document.getElementById(`metric-${key}`);
      if (!el) return;

      const valueEl = el.querySelector('.metric-card__value');
      const trendEl = el.querySelector('.metric-card__trend');

      if (valueEl) {
        const newValue = Utils.formatNumber(reading[key], key === 'temperature' ? 1 : 0);
        if (valueEl.textContent !== newValue) {
          valueEl.textContent = newValue;
          valueEl.classList.remove('value-change');
          void valueEl.offsetWidth; // Force reflow
          valueEl.classList.add('value-change');
        }
      }

      if (trendEl) {
        const trend = Analytics.getTrend(history, key, 5);
        trendEl.className = `metric-card__trend ${trend}`;
        if (trend === 'up') {
          trendEl.innerHTML = '↑ Rising';
        } else if (trend === 'down') {
          trendEl.innerHTML = '↓ Falling';
        } else {
          trendEl.innerHTML = '→ Stable';
        }
      }

      // Update accent color based on status
      const config = SensorSimulator.getPollutantConfig(key);
      if (config) {
        el.style.setProperty('--metric-accent', config.color);
      }
    });
  }

  /**
   * Update the AQI circular gauge
   */
  function updateAQIGauge(aqiResult) {
    const { aqi, category } = aqiResult;

    // Update value
    const valueEl = document.getElementById('aqi-value');
    if (valueEl) {
      valueEl.textContent = aqi;
      valueEl.style.color = category.color;
    }

    // Update category label
    const catEl = document.getElementById('aqi-category');
    if (catEl) {
      catEl.textContent = category.label;
      catEl.style.color = category.color;
      catEl.style.background = category.color + '15';
    }

    // Update SVG gauge arc
    const progressEl = document.getElementById('aqi-gauge-progress');
    if (progressEl) {
      const circumference = 2 * Math.PI * 90; // radius = 90
      const ratio = Math.min(aqi / 500, 1);
      const offset = circumference * (1 - ratio);
      progressEl.style.strokeDasharray = circumference;
      progressEl.style.strokeDashoffset = offset;
      progressEl.style.stroke = category.color;
    }

    // Update gauge glow
    const gaugeEl = document.querySelector('.aqi-gauge');
    if (gaugeEl) {
      gaugeEl.style.filter = `drop-shadow(0 0 20px ${category.color}30)`;
    }

    // Update detail values
    const dominantEl = document.getElementById('aqi-dominant');
    if (dominantEl) {
      const config = SensorSimulator.getPollutantConfig(aqiResult.dominantPollutant);
      dominantEl.textContent = config ? config.name : aqiResult.dominantPollutant;
    }

    const subIndicesEl = document.getElementById('aqi-subindex');
    if (subIndicesEl) {
      const maxSub = Math.max(...Object.values(aqiResult.subIndices));
      subIndicesEl.textContent = maxSub;
    }
  }

  /**
   * Update health recommendations panel
   */
  function updateHealthRecommendations(aqiResult) {
    const container = document.getElementById('health-recommendations');
    if (!container) return;

    const recs = Analytics.getHealthRecommendations(aqiResult);
    container.innerHTML = recs.map(r => `
      <div class="health-rec">
        <span class="health-rec__icon">${r.icon}</span>
        <span>${r.text}</span>
      </div>
    `).join('');
  }

  /**
   * Update statistics panel
   */
  function updateStatsPanel() {
    const history = SensorSimulator.getHistory(24);
    if (history.length === 0) return;

    const stats = Analytics.getAllStats(history);

    // Update stats grid (showing PM2.5 stats as primary)
    const pm25Stats = stats.pm25;
    setStatValue('stat-mean', Utils.formatNumber(pm25Stats.mean, 1));
    setStatValue('stat-max', Utils.formatNumber(pm25Stats.max, 1));
    setStatValue('stat-min', Utils.formatNumber(pm25Stats.min, 1));
    setStatValue('stat-p95', Utils.formatNumber(pm25Stats.p95, 1));

    // Correlation info
    const corr = Analytics.getCorrelationMatrix(history);
    const pmHumCorr = corr.pm25?.humidity || 0;
    setStatValue('stat-corr', Utils.formatNumber(pmHumCorr, 2));

    // Peak count
    const peaks = Analytics.detectPeaks(history, 'pm25');
    setStatValue('stat-peaks', peaks.length.toString());
  }

  /**
   * Set a stat value by element ID
   */
  function setStatValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /**
   * Handle new alert
   */
  function handleNewAlert(alert) {
    // Show toast
    showToast(alert);

    // Show browser notification
    AlertManager.showBrowserNotification(alert);

    // Update alert list
    renderAlertList();
  }

  /**
   * Show toast notification
   */
  function showToast(alert) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${alert.level} toast-enter`;
    toast.innerHTML = `
      <span class="toast__icon">${alert.icon}</span>
      <div class="toast__content">
        <div class="toast__title">${alert.pollutantName} Alert</div>
        <div class="toast__message">${alert.message}</div>
      </div>
      <button class="toast__close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /**
   * Render alert list in sidebar
   */
  function renderAlertList() {
    const listEl = document.getElementById('alert-list');
    const countEl = document.getElementById('alert-count');
    if (!listEl) return;

    const alerts = AlertManager.getAlerts();

    if (countEl) {
      countEl.textContent = alerts.length;
      countEl.style.display = alerts.length > 0 ? 'block' : 'none';
    }

    if (alerts.length === 0) {
      listEl.innerHTML = `
        <div class="alert-empty">
          <span>✅</span>
          <span>No alerts — all values within safe ranges</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = alerts.slice(0, 20).map(a => `
      <div class="alert-item" style="--alert-color: ${a.level === 'danger' ? 'var(--aqi-unhealthy)' : 'var(--aqi-moderate)'}">
        <div class="alert-item__icon">${a.icon}</div>
        <div class="alert-item__content">
          <div class="alert-item__text">${a.message}</div>
          <div class="alert-item__time">${Utils.timeAgo(a.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Build location selector dropdown
   */
  function buildLocationSelector() {
    const selectEl = document.getElementById('location-select');
    if (!selectEl) return;

    const locations = SensorSimulator.getLocations();
    selectEl.innerHTML = Object.entries(locations).map(([key, loc]) =>
      `<option value="${key}" ${key === SensorSimulator.getLocation() ? 'selected' : ''}>${loc.label}</option>`
    ).join('');
  }

  /**
   * Detect user's geographic location via browser Geolocation API
   */
  function detectGeoLocation() {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    const statusEl = document.getElementById('geo-status');
    if (statusEl) statusEl.textContent = 'Detecting...';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`📍 GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

        // Find nearest predefined city
        const nearest = SensorSimulator.getNearestLocation(latitude, longitude);

        // Try reverse geocoding to get the actual city name
        let cityName = null;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await resp.json();
          cityName = data.address?.city || data.address?.town || data.address?.state_district || data.address?.state;
          const country = data.address?.country || '';
          if (cityName) cityName = `${cityName}, ${country}`;
        } catch (e) {
          console.log('Reverse geocoding failed, using nearest city');
        }

        // If the user is close to a predefined city (<200km), use it
        if (nearest.distance < 200) {
          SensorSimulator.setLocation(nearest.key);
          updateLocationSelector(nearest.key);
          if (statusEl) statusEl.textContent = SensorSimulator.getLocations()[nearest.key]?.label || '';
        } else if (cityName) {
          // Add user's actual city as a custom location with moderate defaults
          const customKey = 'user-location';
          SensorSimulator.addCustomLocation(customKey, cityName, latitude, longitude);
          SensorSimulator.setLocation(customKey);
          buildLocationSelector(); // Rebuild to include the new city
          updateLocationSelector(customKey);
          if (statusEl) statusEl.textContent = `📍 ${cityName}`;
        } else {
          // Fallback to nearest
          SensorSimulator.setLocation(nearest.key);
          updateLocationSelector(nearest.key);
          if (statusEl) statusEl.textContent = SensorSimulator.getLocations()[nearest.key]?.label || '';
        }

        // Reset charts for the new location
        ChartManager.resetRealtimeData();
        ChartManager.updateAllCharts();
        updateStatsPanel();

        showToast({
          icon: '📍',
          level: 'info',
          pollutantName: 'Location',
          message: `Monitoring air quality for ${cityName || SensorSimulator.getLocations()[SensorSimulator.getLocation()]?.label || 'your area'}`,
        });
      },
      (error) => {
        console.log('Geolocation denied or failed:', error.message);
        if (statusEl) statusEl.textContent = 'Location unavailable';
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  /**
   * Update the location select dropdown to reflect a new value
   */
  function updateLocationSelector(key) {
    const selectEl = document.getElementById('location-select');
    if (selectEl) selectEl.value = key;
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Location change
    const locationSelect = document.getElementById('location-select');
    if (locationSelect) {
      locationSelect.addEventListener('change', (e) => {
        SensorSimulator.setLocation(e.target.value);
        ChartManager.resetRealtimeData();
        ChartManager.updateAllCharts();
        updateStatsPanel();

        // Update geo-status display
        const loc = SensorSimulator.getLocations()[e.target.value];
        const statusEl = document.getElementById('geo-status');
        if (statusEl && loc) statusEl.textContent = loc.label;
      });
    }

    // Detect location button
    const detectBtn = document.getElementById('btn-detect-location');
    if (detectBtn) {
      detectBtn.addEventListener('click', () => detectGeoLocation());
    }

    // Chart tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target.dataset.tab;
        switchChartTab(target);
      });
    });

    // Pollutant toggles
    document.querySelectorAll('.pollutant-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.currentTarget.dataset.pollutant;
        ChartManager.togglePollutant(key);
        e.currentTarget.classList.toggle('active');
      });
    });

    // Settings modal
    const settingsBtn = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeModal = document.getElementById('close-modal');
    const saveBtn = document.getElementById('btn-save-thresholds');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        openSettingsModal();
        settingsModal.classList.add('active');
      });
    }

    if (closeModal && settingsModal) {
      closeModal.addEventListener('click', () => settingsModal.classList.remove('active'));
    }

    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('active');
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', saveThresholds);
    }

    // Export CSV
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => Analytics.exportToCSV());
    }

    // Clear alerts
    const clearAlertsBtn = document.getElementById('btn-clear-alerts');
    if (clearAlertsBtn) {
      clearAlertsBtn.addEventListener('click', () => {
        AlertManager.clearAlerts();
        renderAlertList();
      });
    }
  }

  /**
   * Switch between chart tabs
   */
  function switchChartTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.chart-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });

    // Show/hide chart containers
    document.querySelectorAll('.chart-container').forEach(c => {
      c.classList.toggle('chart-container--hidden', c.id !== `chart-${tabId}`);
    });

    // Trigger chart update for the active tab
    if (tabId === 'trends') ChartManager.updateTrendChart();
    if (tabId === 'weekly') ChartManager.updateWeeklyChart();
    if (tabId === 'correlation') ChartManager.updateCorrelationChart();
  }

  /**
   * Open settings modal and populate values
   */
  function openSettingsModal() {
    const thresholds = AlertManager.getThresholds();
    Object.entries(thresholds).forEach(([key, t]) => {
      const warnInput = document.getElementById(`threshold-${key}-warning`);
      const dangerInput = document.getElementById(`threshold-${key}-danger`);
      if (warnInput) warnInput.value = t.warning;
      if (dangerInput) dangerInput.value = t.danger;
    });
  }

  /**
   * Save thresholds from modal
   */
  function saveThresholds() {
    const keys = ['pm25', 'pm10', 'co2', 'voc', 'temperature', 'humidity'];
    const newThresholds = {};

    keys.forEach(key => {
      const warnInput = document.getElementById(`threshold-${key}-warning`);
      const dangerInput = document.getElementById(`threshold-${key}-danger`);
      if (warnInput && dangerInput) {
        newThresholds[key] = {
          warning: parseFloat(warnInput.value) || 0,
          danger: parseFloat(dangerInput.value) || 0,
          unit: AlertManager.getThresholds()[key]?.unit || '',
        };
      }
    });

    AlertManager.setThresholds(newThresholds);

    // Close modal
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('active');

    // Show confirmation toast
    showToast({
      icon: '⚙️',
      level: 'info',
      pollutantName: 'Settings',
      message: 'Alert thresholds updated successfully.',
    });
  }

  /**
   * Start the live clock
   */
  function startClock() {
    const clockEl = document.getElementById('header-clock');
    if (!clockEl) return;

    function updateClock() {
      const now = new Date();
      clockEl.textContent = Utils.formatDateTime(now);
    }

    updateClock();
    clockInterval = setInterval(updateClock, 1000);
  }

  /**
   * Cleanup
   */
  function destroy() {
    if (updateInterval) clearInterval(updateInterval);
    if (clockInterval) clearInterval(clockInterval);
    if (chartUpdateInterval) clearInterval(chartUpdateInterval);
    ChartManager.destroy();
  }

  return { init, destroy };
})();

// Boot the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
