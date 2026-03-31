// ============================================
// AIR MONITOR PRO — Alert Manager
// ============================================

const AlertManager = (() => {
  const MAX_ALERTS = 50;

  // Default thresholds
  const DEFAULT_THRESHOLDS = {
    pm25:  { warning: 35, danger: 55, unit: 'μg/m³' },
    pm10:  { warning: 100, danger: 155, unit: 'μg/m³' },
    co2:   { warning: 1000, danger: 2000, unit: 'ppm' },
    voc:   { warning: 250, danger: 400, unit: 'ppb' },
    temperature: { warning: 32, danger: 38, unit: '°C' },
    humidity:    { warning: 70, danger: 85, unit: '%' },
  };

  let thresholds = {};
  let alerts = [];
  let onAlertCallbacks = [];
  let cooldowns = {}; // prevent duplicate alerts within 30s

  /**
   * Initialize from localStorage or defaults
   */
  function init() {
    const saved = localStorage.getItem('airmonitor_thresholds');
    if (saved) {
      try {
        thresholds = JSON.parse(saved);
      } catch {
        thresholds = { ...DEFAULT_THRESHOLDS };
      }
    } else {
      thresholds = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
    }

    // Load saved alerts
    const savedAlerts = localStorage.getItem('airmonitor_alerts');
    if (savedAlerts) {
      try {
        alerts = JSON.parse(savedAlerts).map(a => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }));
      } catch {
        alerts = [];
      }
    }
  }

  /**
   * Check a reading against thresholds and generate alerts
   */
  function checkReading(reading) {
    const newAlerts = [];

    Object.keys(thresholds).forEach(key => {
      const value = reading[key];
      if (value === undefined) return;

      const t = thresholds[key];
      const cooldownKey = key;
      const now = Date.now();

      // Check cooldown (30 second minimum between same-pollutant alerts)
      if (cooldowns[cooldownKey] && now - cooldowns[cooldownKey] < 30000) return;

      const config = SensorSimulator.getPollutantConfig(key);
      const name = config?.name || key;

      if (value >= t.danger) {
        const alert = {
          id: Utils.uid(),
          pollutant: key,
          pollutantName: name,
          level: 'danger',
          value: Utils.formatNumber(value, 1),
          threshold: t.danger,
          unit: t.unit,
          message: `${name} at ${Utils.formatNumber(value, 1)} ${t.unit} — exceeds danger level (${t.danger})`,
          timestamp: new Date(),
          icon: '🔴',
        };
        newAlerts.push(alert);
        cooldowns[cooldownKey] = now;
      } else if (value >= t.warning) {
        const alert = {
          id: Utils.uid(),
          pollutant: key,
          pollutantName: name,
          level: 'warning',
          value: Utils.formatNumber(value, 1),
          threshold: t.warning,
          unit: t.unit,
          message: `${name} at ${Utils.formatNumber(value, 1)} ${t.unit} — exceeds warning level (${t.warning})`,
          timestamp: new Date(),
          icon: '🟡',
        };
        newAlerts.push(alert);
        cooldowns[cooldownKey] = now;
      }
    });

    // Add new alerts
    if (newAlerts.length > 0) {
      alerts = [...newAlerts, ...alerts].slice(0, MAX_ALERTS);
      saveAlerts();
      newAlerts.forEach(a => notifyCallbacks(a));
    }

    return newAlerts;
  }

  /**
   * Register a callback for new alerts
   */
  function onAlert(callback) {
    onAlertCallbacks.push(callback);
  }

  /**
   * Notify all alert callbacks
   */
  function notifyCallbacks(alert) {
    onAlertCallbacks.forEach(cb => cb(alert));
  }

  /**
   * Show browser notification
   */
  function showBrowserNotification(alert) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Air Quality Alert: ${alert.pollutantName}`, {
        body: alert.message,
        icon: alert.level === 'danger' ? '🔴' : '🟡',
        tag: alert.pollutant,
      });
    }
  }

  /**
   * Request notification permission
   */
  function requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /**
   * Get all alerts
   */
  function getAlerts() {
    return [...alerts];
  }

  /**
   * Clear all alerts
   */
  function clearAlerts() {
    alerts = [];
    saveAlerts();
  }

  /**
   * Get current thresholds
   */
  function getThresholds() {
    return JSON.parse(JSON.stringify(thresholds));
  }

  /**
   * Update thresholds
   */
  function setThresholds(newThresholds) {
    thresholds = { ...thresholds, ...newThresholds };
    localStorage.setItem('airmonitor_thresholds', JSON.stringify(thresholds));
  }

  /**
   * Save alerts to localStorage
   */
  function saveAlerts() {
    localStorage.setItem('airmonitor_alerts', JSON.stringify(alerts));
  }

  /**
   * Get default thresholds
   */
  function getDefaults() {
    return { ...DEFAULT_THRESHOLDS };
  }

  return {
    init,
    checkReading,
    onAlert,
    showBrowserNotification,
    requestPermission,
    getAlerts,
    clearAlerts,
    getThresholds,
    setThresholds,
    getDefaults,
  };
})();
