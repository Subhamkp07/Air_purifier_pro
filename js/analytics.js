// ============================================
// AIR MONITOR PRO — Data Analytics Module
// ============================================

const Analytics = (() => {

  /**
   * Calculate comprehensive statistics for a pollutant from history data
   */
  function getStats(history, key) {
    const values = history.map(d => d[key]).filter(v => v !== undefined && v !== null);
    if (values.length === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, p95: 0, count: 0 };
    }

    return {
      mean: Utils.mean(values),
      median: Utils.median(values),
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev: Utils.stdDev(values),
      p95: Utils.percentile(values, 95),
      count: values.length,
    };
  }

  /**
   * Get stats for all pollutants
   */
  function getAllStats(history) {
    const keys = ['pm25', 'pm10', 'co2', 'voc', 'temperature', 'humidity'];
    const result = {};
    keys.forEach(key => {
      result[key] = getStats(history, key);
    });
    return result;
  }

  /**
   * Calculate correlation matrix between pollutants
   */
  function getCorrelationMatrix(history) {
    const keys = ['pm25', 'pm10', 'co2', 'voc', 'temperature', 'humidity'];
    const matrix = {};

    keys.forEach(k1 => {
      matrix[k1] = {};
      keys.forEach(k2 => {
        const x = history.map(d => d[k1]);
        const y = history.map(d => d[k2]);
        matrix[k1][k2] = Utils.pearsonCorrelation(x, y);
      });
    });

    return matrix;
  }

  /**
   * Detect peaks (pollution spikes) in a dataset
   */
  function detectPeaks(history, key, thresholdMultiplier = 2) {
    const values = history.map(d => d[key]);
    const avg = Utils.mean(values);
    const sd = Utils.stdDev(values);
    const threshold = avg + sd * thresholdMultiplier;

    const peaks = [];
    let inPeak = false;
    let peakStart = null;
    let peakMax = 0;

    history.forEach((d, i) => {
      if (d[key] > threshold) {
        if (!inPeak) {
          inPeak = true;
          peakStart = i;
          peakMax = d[key];
        } else {
          peakMax = Math.max(peakMax, d[key]);
        }
      } else if (inPeak) {
        peaks.push({
          startIndex: peakStart,
          endIndex: i - 1,
          startTime: history[peakStart].timestamp,
          endTime: history[i - 1].timestamp,
          maxValue: peakMax,
          duration: history[i - 1].timestamp - history[peakStart].timestamp,
        });
        inPeak = false;
      }
    });

    return peaks;
  }

  /**
   * Get trend direction (up, down, stable) comparing recent vs earlier data
   */
  function getTrend(history, key, recentCount = 5) {
    if (history.length < recentCount * 2) return 'stable';

    const recent = history.slice(-recentCount).map(d => d[key]);
    const earlier = history.slice(-recentCount * 2, -recentCount).map(d => d[key]);

    const recentAvg = Utils.mean(recent);
    const earlierAvg = Utils.mean(earlier);

    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  /**
   * Get health recommendations based on current AQI
   */
  function getHealthRecommendations(aqiResult) {
    const recommendations = [];
    const { aqi, category, dominantPollutant } = aqiResult;

    if (aqi <= 50) {
      recommendations.push({ icon: '✅', text: 'Air quality is excellent. Safe for outdoor activities.' });
      recommendations.push({ icon: '🪟', text: 'Good time to open windows for ventilation.' });
    } else if (aqi <= 100) {
      recommendations.push({ icon: '⚠️', text: 'Air quality is acceptable. Sensitive groups should limit prolonged outdoor exertion.' });
      recommendations.push({ icon: '🌿', text: 'Consider using an air purifier for improved indoor air.' });
    } else if (aqi <= 150) {
      recommendations.push({ icon: '😷', text: 'Sensitive groups may experience health effects. Reduce outdoor activity.' });
      recommendations.push({ icon: '🚫', text: 'Close windows and use air purification.' });
      recommendations.push({ icon: '💊', text: 'People with respiratory conditions should have medication readily available.' });
    } else if (aqi <= 200) {
      recommendations.push({ icon: '🔴', text: 'Everyone may experience health effects. Avoid prolonged outdoor exposure.' });
      recommendations.push({ icon: '🏠', text: 'Stay indoors with windows closed.' });
      recommendations.push({ icon: '🫁', text: 'Use N95 masks if going outside is necessary.' });
    } else if (aqi <= 300) {
      recommendations.push({ icon: '⛔', text: 'Health alert: significant risk. Avoid all outdoor activities.' });
      recommendations.push({ icon: '🏥', text: 'Seek medical attention if experiencing symptoms.' });
      recommendations.push({ icon: '🔌', text: 'Run air purifiers at maximum setting.' });
    } else {
      recommendations.push({ icon: '☠️', text: 'HAZARDOUS: Emergency conditions. Stay indoors at all times.' });
      recommendations.push({ icon: '📞', text: 'Contact health authorities if experiencing distress.' });
      recommendations.push({ icon: '🚨', text: 'All outdoor activities should be cancelled.' });
    }

    // Pollutant-specific advice
    if (dominantPollutant === 'co2') {
      recommendations.push({ icon: '🌬️', text: 'High CO₂ detected. Improve ventilation immediately.' });
    }
    if (dominantPollutant === 'voc') {
      recommendations.push({ icon: '🧴', text: 'High VOC levels. Check for chemical sources (cleaning products, paint, etc.).' });
    }

    return recommendations;
  }

  /**
   * Generate CSV export data
   */
  function exportToCSV() {
    const history = SensorSimulator.getAllHistory();
    const headers = ['timestamp', 'pm25', 'pm10', 'co2', 'voc', 'temperature', 'humidity', 'aqi'];

    const data = history.map(d => {
      const aqiResult = AQIEngine.calculate(d);
      return {
        timestamp: Utils.formatDateTime(d.timestamp),
        pm25: Utils.formatNumber(d.pm25, 2),
        pm10: Utils.formatNumber(d.pm10, 2),
        co2: Utils.formatNumber(d.co2, 1),
        voc: Utils.formatNumber(d.voc, 1),
        temperature: Utils.formatNumber(d.temperature, 1),
        humidity: Utils.formatNumber(d.humidity, 1),
        aqi: aqiResult.aqi,
      };
    });

    const csv = Utils.toCSV(data, headers);
    const filename = `air_quality_data_${new Date().toISOString().slice(0, 10)}.csv`;
    Utils.downloadFile(csv, filename);
  }

  return {
    getStats,
    getAllStats,
    getCorrelationMatrix,
    detectPeaks,
    getTrend,
    getHealthRecommendations,
    exportToCSV,
  };
})();
