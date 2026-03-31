// ============================================
// AIR MONITOR PRO — Utility Functions
// ============================================

const Utils = (() => {
  /**
   * Clamp a value between min and max
   */
  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  /**
   * Linear interpolation
   */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Random number between min and max
   */
  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Random integer between min and max (inclusive)
   */
  function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
  }

  /**
   * Format number with specified decimal places
   */
  function formatNumber(num, decimals = 1) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    return Number(num).toFixed(decimals);
  }

  /**
   * Format timestamp to HH:MM:SS
   */
  function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Format timestamp to HH:MM
   */
  function formatTimeShort(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * Format date to readable string
   */
  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Format date to full datetime string
   */
  function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
  }

  /**
   * Time ago string (e.g. "2m ago")
   */
  function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Calculate mean of array
   */
  function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Calculate median of array
   */
  function median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate standard deviation
   */
  function stdDev(arr) {
    if (!arr || arr.length < 2) return 0;
    const avg = mean(arr);
    const variance = arr.reduce((sum, val) => sum + (val - avg) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Calculate percentile
   */
  function percentile(arr, p) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return lerp(sorted[lower], sorted[upper], idx - lower);
  }

  /**
   * Simple moving average
   */
  function movingAverage(arr, windowSize) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = arr.slice(start, i + 1);
      result.push(mean(window));
    }
    return result;
  }

  /**
   * Pearson correlation coefficient between two arrays
   */
  function pearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;
    const mx = mean(x.slice(0, n));
    const my = mean(y.slice(0, n));
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) {
      const xi = x[i] - mx;
      const yi = y[i] - my;
      num += xi * yi;
      dx += xi * xi;
      dy += yi * yi;
    }
    const denom = Math.sqrt(dx * dy);
    return denom === 0 ? 0 : num / denom;
  }

  /**
   * Throttle a function
   */
  function throttle(fn, limit) {
    let inThrottle = false;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Debounce a function
   */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Generate a unique ID
   */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Convert array of objects to CSV string
   */
  function toCSV(data, headers) {
    const csv = [headers.join(',')];
    data.forEach(row => {
      csv.push(headers.map(h => {
        const val = row[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(','));
    });
    return csv.join('\n');
  }

  /**
   * Download text as file
   */
  function downloadFile(content, filename, mimeType = 'text/csv') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    clamp, lerp, random, randomInt,
    formatNumber, formatTime, formatTimeShort, formatDate, formatDateTime, timeAgo,
    mean, median, stdDev, percentile, movingAverage, pearsonCorrelation,
    throttle, debounce, uid, toCSV, downloadFile
  };
})();
