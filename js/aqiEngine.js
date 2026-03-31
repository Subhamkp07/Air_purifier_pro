// ============================================
// AIR MONITOR PRO — AQI Calculation Engine
// ============================================

const AQIEngine = (() => {

  // EPA AQI breakpoint tables
  const BREAKPOINTS = {
    pm25: [
      { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
      { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
      { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
      { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
      { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
      { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
    ],
    pm10: [
      { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
      { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
      { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
      { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
      { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
      { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 },
    ],
    co2: [
      { cLow: 0, cHigh: 600, iLow: 0, iHigh: 50 },
      { cLow: 601, cHigh: 1000, iLow: 51, iHigh: 100 },
      { cLow: 1001, cHigh: 1500, iLow: 101, iHigh: 150 },
      { cLow: 1501, cHigh: 2000, iLow: 151, iHigh: 200 },
      { cLow: 2001, cHigh: 3000, iLow: 201, iHigh: 300 },
      { cLow: 3001, cHigh: 5000, iLow: 301, iHigh: 500 },
    ],
    voc: [
      { cLow: 0, cHigh: 100, iLow: 0, iHigh: 50 },
      { cLow: 101, cHigh: 250, iLow: 51, iHigh: 100 },
      { cLow: 251, cHigh: 400, iLow: 101, iHigh: 150 },
      { cLow: 401, cHigh: 600, iLow: 151, iHigh: 200 },
      { cLow: 601, cHigh: 800, iLow: 201, iHigh: 300 },
      { cLow: 801, cHigh: 1200, iLow: 301, iHigh: 500 },
    ]
  };

  // AQI category definitions
  const CATEGORIES = [
    { min: 0, max: 50, label: 'Good', color: '#10b981', cssClass: 'aqi-good', emoji: '😊' },
    { min: 51, max: 100, label: 'Moderate', color: '#f59e0b', cssClass: 'aqi-moderate', emoji: '😐' },
    { min: 101, max: 150, label: 'Unhealthy (SG)', color: '#f97316', cssClass: 'aqi-usg', emoji: '😷' },
    { min: 151, max: 200, label: 'Unhealthy', color: '#ef4444', cssClass: 'aqi-unhealthy', emoji: '🤢' },
    { min: 201, max: 300, label: 'Very Unhealthy', color: '#8b5cf6', cssClass: 'aqi-very-unhealthy', emoji: '⚠️' },
    { min: 301, max: 500, label: 'Hazardous', color: '#991b1b', cssClass: 'aqi-hazardous', emoji: '☠️' },
  ];

  /**
   * Calculate sub-index for a single pollutant using EPA formula
   * Ip = ((IHi - ILo) / (BPHi - BPLo)) * (Cp - BPLo) + ILo
   */
  function calculateSubIndex(pollutant, concentration) {
    const bp = BREAKPOINTS[pollutant];
    if (!bp) return 0;

    const c = Math.max(0, concentration);

    // Find the breakpoint range
    for (let i = 0; i < bp.length; i++) {
      if (c >= bp[i].cLow && c <= bp[i].cHigh) {
        const { cLow, cHigh, iLow, iHigh } = bp[i];
        return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow);
      }
    }

    // If concentration exceeds table, return max
    return 500;
  }

  /**
   * Calculate overall AQI from a reading
   * Returns { aqi, category, dominantPollutant, subIndices }
   */
  function calculate(reading) {
    const subIndices = {};
    let maxAQI = 0;
    let dominant = 'pm25';

    ['pm25', 'pm10', 'co2', 'voc'].forEach(key => {
      if (reading[key] !== undefined) {
        const subIdx = calculateSubIndex(key, reading[key]);
        subIndices[key] = subIdx;
        if (subIdx > maxAQI) {
          maxAQI = subIdx;
          dominant = key;
        }
      }
    });

    const category = getCategory(maxAQI);

    return {
      aqi: maxAQI,
      category,
      dominantPollutant: dominant,
      subIndices,
    };
  }

  /**
   * Get the AQI category for a given AQI value
   */
  function getCategory(aqi) {
    for (const cat of CATEGORIES) {
      if (aqi >= cat.min && aqi <= cat.max) {
        return cat;
      }
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  /**
   * Get color for an AQI value (for gradients)
   */
  function getColor(aqi) {
    return getCategory(aqi).color;
  }

  /**
   * Get all categories
   */
  function getCategories() {
    return [...CATEGORIES];
  }

  return {
    BREAKPOINTS,
    CATEGORIES,
    calculate,
    calculateSubIndex,
    getCategory,
    getColor,
    getCategories,
  };
})();
