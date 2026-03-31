// ============================================
// AIR MONITOR PRO — Sensor Data Engine
// City-specific data based on historical averages
// ============================================

const SensorSimulator = (() => {
  // Pollutant configurations
  const POLLUTANTS = {
    pm25: {
      name: 'PM2.5',
      unit: 'μg/m³',
      icon: '🌫️',
      baseRange: [8, 35],
      spikeMax: 150,
      diurnalAmplitude: 12,
      color: '#22d3ee',
    },
    pm10: {
      name: 'PM10',
      unit: 'μg/m³',
      icon: '💨',
      baseRange: [15, 60],
      spikeMax: 250,
      diurnalAmplitude: 20,
      color: '#3b82f6',
    },
    co2: {
      name: 'CO₂',
      unit: 'ppm',
      icon: '🫧',
      baseRange: [400, 800],
      spikeMax: 2500,
      diurnalAmplitude: 150,
      color: '#8b5cf6',
    },
    voc: {
      name: 'VOC',
      unit: 'ppb',
      icon: '🧪',
      baseRange: [50, 200],
      spikeMax: 800,
      diurnalAmplitude: 60,
      color: '#ec4899',
    },
    temperature: {
      name: 'Temp',
      unit: '°C',
      icon: '🌡️',
      baseRange: [20, 28],
      spikeMax: 38,
      diurnalAmplitude: 4,
      color: '#f97316',
    },
    humidity: {
      name: 'Humidity',
      unit: '%',
      icon: '💧',
      baseRange: [35, 65],
      spikeMax: 95,
      diurnalAmplitude: 10,
      color: '#14b8a6',
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // CITY DATABASE — Based on real historical AQI averages
  // pm25/pm10 in μg/m³, co2 in ppm, voc in ppb, temp in °C, humidity in %
  // Sources: CPCB India, IQAir, WHO annual reports
  // ══════════════════════════════════════════════════════════════════
  const LOCATIONS = {
    // ─── North India ───
    'new-delhi': {
      label: '📍 New Delhi, Delhi',
      lat: 28.6139, lng: 77.2090,
      baselines: { pm25: 85, pm10: 150, co2: 620, voc: 180, temperature: 32, humidity: 45 },
    },
    'gurugram': {
      label: '📍 Gurugram, Haryana',
      lat: 28.4595, lng: 77.0266,
      baselines: { pm25: 78, pm10: 140, co2: 590, voc: 170, temperature: 33, humidity: 42 },
    },
    'noida': {
      label: '📍 Noida, Uttar Pradesh',
      lat: 28.5355, lng: 77.3910,
      baselines: { pm25: 82, pm10: 145, co2: 610, voc: 175, temperature: 32, humidity: 44 },
    },
    'lucknow': {
      label: '📍 Lucknow, Uttar Pradesh',
      lat: 26.8467, lng: 80.9462,
      baselines: { pm25: 70, pm10: 130, co2: 560, voc: 155, temperature: 31, humidity: 52 },
    },
    'kanpur': {
      label: '📍 Kanpur, Uttar Pradesh',
      lat: 26.4499, lng: 80.3319,
      baselines: { pm25: 90, pm10: 160, co2: 640, voc: 190, temperature: 31, humidity: 48 },
    },
    'varanasi': {
      label: '📍 Varanasi, Uttar Pradesh',
      lat: 25.3176, lng: 82.9739,
      baselines: { pm25: 75, pm10: 135, co2: 570, voc: 160, temperature: 30, humidity: 55 },
    },
    'agra': {
      label: '📍 Agra, Uttar Pradesh',
      lat: 27.1767, lng: 78.0081,
      baselines: { pm25: 72, pm10: 138, co2: 550, voc: 150, temperature: 32, humidity: 40 },
    },
    'prayagraj': {
      label: '📍 Prayagraj, Uttar Pradesh',
      lat: 25.4358, lng: 81.8463,
      baselines: { pm25: 68, pm10: 125, co2: 540, voc: 148, temperature: 30, humidity: 50 },
    },
    'chandigarh': {
      label: '📍 Chandigarh',
      lat: 30.7333, lng: 76.7794,
      baselines: { pm25: 45, pm10: 85, co2: 480, voc: 110, temperature: 28, humidity: 48 },
    },
    'amritsar': {
      label: '📍 Amritsar, Punjab',
      lat: 31.6340, lng: 74.8723,
      baselines: { pm25: 55, pm10: 100, co2: 510, voc: 130, temperature: 29, humidity: 45 },
    },
    'ludhiana': {
      label: '📍 Ludhiana, Punjab',
      lat: 30.9010, lng: 75.8573,
      baselines: { pm25: 65, pm10: 120, co2: 530, voc: 145, temperature: 29, humidity: 47 },
    },
    'jaipur': {
      label: '📍 Jaipur, Rajasthan',
      lat: 26.9124, lng: 75.7873,
      baselines: { pm25: 58, pm10: 130, co2: 500, voc: 125, temperature: 34, humidity: 32 },
    },
    'jodhpur': {
      label: '📍 Jodhpur, Rajasthan',
      lat: 26.2389, lng: 73.0243,
      baselines: { pm25: 50, pm10: 145, co2: 470, voc: 105, temperature: 36, humidity: 25 },
    },
    'dehradun': {
      label: '📍 Dehradun, Uttarakhand',
      lat: 30.3165, lng: 78.0322,
      baselines: { pm25: 35, pm10: 65, co2: 440, voc: 90, temperature: 24, humidity: 60 },
    },
    'shimla': {
      label: '📍 Shimla, Himachal Pradesh',
      lat: 31.1048, lng: 77.1734,
      baselines: { pm25: 18, pm10: 35, co2: 410, voc: 60, temperature: 16, humidity: 65 },
    },
    'srinagar': {
      label: '📍 Srinagar, J&K',
      lat: 34.0837, lng: 74.7973,
      baselines: { pm25: 30, pm10: 55, co2: 425, voc: 75, temperature: 14, humidity: 58 },
    },
    'jammu': {
      label: '📍 Jammu, J&K',
      lat: 32.7266, lng: 74.8570,
      baselines: { pm25: 40, pm10: 70, co2: 460, voc: 95, temperature: 26, humidity: 50 },
    },

    // ─── East India ───
    'kolkata': {
      label: '📍 Kolkata, West Bengal',
      lat: 22.5726, lng: 88.3639,
      baselines: { pm25: 62, pm10: 110, co2: 540, voc: 140, temperature: 30, humidity: 72 },
    },
    'patna': {
      label: '📍 Patna, Bihar',
      lat: 25.6093, lng: 85.1376,
      baselines: { pm25: 80, pm10: 145, co2: 600, voc: 170, temperature: 30, humidity: 55 },
    },
    'ranchi': {
      label: '📍 Ranchi, Jharkhand',
      lat: 23.3441, lng: 85.3096,
      baselines: { pm25: 42, pm10: 80, co2: 470, voc: 110, temperature: 27, humidity: 58 },
    },
    'bhubaneswar': {
      label: '📍 Bhubaneswar, Odisha',
      lat: 20.2961, lng: 85.8245,
      baselines: { pm25: 38, pm10: 75, co2: 460, voc: 100, temperature: 30, humidity: 68 },
    },
    'guwahati': {
      label: '📍 Guwahati, Assam',
      lat: 26.1445, lng: 91.7362,
      baselines: { pm25: 35, pm10: 65, co2: 445, voc: 90, temperature: 27, humidity: 70 },
    },
    'imphal': {
      label: '📍 Imphal, Manipur',
      lat: 24.8170, lng: 93.9368,
      baselines: { pm25: 22, pm10: 45, co2: 420, voc: 70, temperature: 24, humidity: 65 },
    },
    'shillong': {
      label: '📍 Shillong, Meghalaya',
      lat: 25.5788, lng: 91.8933,
      baselines: { pm25: 18, pm10: 38, co2: 410, voc: 55, temperature: 19, humidity: 75 },
    },
    'agartala': {
      label: '📍 Agartala, Tripura',
      lat: 23.8315, lng: 91.2868,
      baselines: { pm25: 28, pm10: 55, co2: 430, voc: 80, temperature: 28, humidity: 72 },
    },
    'gangtok': {
      label: '📍 Gangtok, Sikkim',
      lat: 27.3389, lng: 88.6065,
      baselines: { pm25: 12, pm10: 25, co2: 400, voc: 40, temperature: 15, humidity: 70 },
    },
    'itanagar': {
      label: '📍 Itanagar, Arunachal Pradesh',
      lat: 27.0844, lng: 93.6053,
      baselines: { pm25: 15, pm10: 30, co2: 405, voc: 50, temperature: 20, humidity: 68 },
    },
    'kohima': {
      label: '📍 Kohima, Nagaland',
      lat: 25.6751, lng: 94.1086,
      baselines: { pm25: 16, pm10: 32, co2: 408, voc: 52, temperature: 20, humidity: 65 },
    },
    'aizawl': {
      label: '📍 Aizawl, Mizoram',
      lat: 23.7271, lng: 92.7176,
      baselines: { pm25: 14, pm10: 28, co2: 402, voc: 45, temperature: 22, humidity: 70 },
    },

    // ─── West India ───
    'mumbai': {
      label: '📍 Mumbai, Maharashtra',
      lat: 19.0760, lng: 72.8777,
      baselines: { pm25: 52, pm10: 95, co2: 520, voc: 135, temperature: 30, humidity: 75 },
    },
    'pune': {
      label: '📍 Pune, Maharashtra',
      lat: 18.5204, lng: 73.8567,
      baselines: { pm25: 38, pm10: 70, co2: 470, voc: 105, temperature: 28, humidity: 55 },
    },
    'nagpur': {
      label: '📍 Nagpur, Maharashtra',
      lat: 21.1458, lng: 79.0882,
      baselines: { pm25: 45, pm10: 85, co2: 490, voc: 115, temperature: 33, humidity: 42 },
    },
    'ahmedabad': {
      label: '📍 Ahmedabad, Gujarat',
      lat: 23.0225, lng: 72.5714,
      baselines: { pm25: 60, pm10: 115, co2: 540, voc: 140, temperature: 34, humidity: 35 },
    },
    'surat': {
      label: '📍 Surat, Gujarat',
      lat: 21.1702, lng: 72.8311,
      baselines: { pm25: 48, pm10: 90, co2: 500, voc: 125, temperature: 32, humidity: 60 },
    },
    'vadodara': {
      label: '📍 Vadodara, Gujarat',
      lat: 22.3072, lng: 73.1812,
      baselines: { pm25: 50, pm10: 95, co2: 510, voc: 130, temperature: 33, humidity: 40 },
    },
    'rajkot': {
      label: '📍 Rajkot, Gujarat',
      lat: 22.3039, lng: 70.8022,
      baselines: { pm25: 42, pm10: 88, co2: 480, voc: 110, temperature: 33, humidity: 35 },
    },
    'panaji': {
      label: '📍 Panaji, Goa',
      lat: 15.4909, lng: 73.8278,
      baselines: { pm25: 18, pm10: 35, co2: 420, voc: 60, temperature: 29, humidity: 78 },
    },

    // ─── South India ───
    'bangalore': {
      label: '📍 Bengaluru, Karnataka',
      lat: 12.9716, lng: 77.5946,
      baselines: { pm25: 32, pm10: 62, co2: 460, voc: 95, temperature: 26, humidity: 58 },
    },
    'mysore': {
      label: '📍 Mysuru, Karnataka',
      lat: 12.2958, lng: 76.6394,
      baselines: { pm25: 22, pm10: 45, co2: 430, voc: 70, temperature: 26, humidity: 55 },
    },
    'chennai': {
      label: '📍 Chennai, Tamil Nadu',
      lat: 13.0827, lng: 80.2707,
      baselines: { pm25: 38, pm10: 72, co2: 475, voc: 105, temperature: 32, humidity: 72 },
    },
    'coimbatore': {
      label: '📍 Coimbatore, Tamil Nadu',
      lat: 11.0168, lng: 76.9558,
      baselines: { pm25: 25, pm10: 50, co2: 440, voc: 75, temperature: 28, humidity: 55 },
    },
    'madurai': {
      label: '📍 Madurai, Tamil Nadu',
      lat: 9.9252, lng: 78.1198,
      baselines: { pm25: 30, pm10: 58, co2: 450, voc: 85, temperature: 31, humidity: 55 },
    },
    'hyderabad': {
      label: '📍 Hyderabad, Telangana',
      lat: 17.3850, lng: 78.4867,
      baselines: { pm25: 40, pm10: 78, co2: 480, voc: 110, temperature: 31, humidity: 50 },
    },
    'visakhapatnam': {
      label: '📍 Visakhapatnam, Andhra Pradesh',
      lat: 17.6868, lng: 83.2185,
      baselines: { pm25: 32, pm10: 60, co2: 455, voc: 90, temperature: 30, humidity: 70 },
    },
    'amaravati': {
      label: '📍 Amaravati, Andhra Pradesh',
      lat: 16.5062, lng: 80.6480,
      baselines: { pm25: 28, pm10: 55, co2: 445, voc: 80, temperature: 31, humidity: 60 },
    },
    'kochi': {
      label: '📍 Kochi, Kerala',
      lat: 9.9312, lng: 76.2673,
      baselines: { pm25: 22, pm10: 42, co2: 425, voc: 65, temperature: 29, humidity: 80 },
    },
    'thiruvananthapuram': {
      label: '📍 Thiruvananthapuram, Kerala',
      lat: 8.5241, lng: 76.9366,
      baselines: { pm25: 20, pm10: 38, co2: 420, voc: 58, temperature: 29, humidity: 82 },
    },

    // ─── Central India ───
    'bhopal': {
      label: '📍 Bhopal, Madhya Pradesh',
      lat: 23.2599, lng: 77.4126,
      baselines: { pm25: 48, pm10: 90, co2: 500, voc: 120, temperature: 30, humidity: 45 },
    },
    'indore': {
      label: '📍 Indore, Madhya Pradesh',
      lat: 22.7196, lng: 75.8577,
      baselines: { pm25: 40, pm10: 78, co2: 475, voc: 105, temperature: 30, humidity: 42 },
    },
    'raipur': {
      label: '📍 Raipur, Chhattisgarh',
      lat: 21.2514, lng: 81.6296,
      baselines: { pm25: 55, pm10: 100, co2: 520, voc: 135, temperature: 30, humidity: 48 },
    },

    // ─── International (for comparison) ───
    'beijing': {
      label: '📍 Beijing, China',
      lat: 39.9042, lng: 116.4074,
      baselines: { pm25: 75, pm10: 130, co2: 580, voc: 165, temperature: 18, humidity: 45 },
    },
    'los-angeles': {
      label: '📍 Los Angeles, USA',
      lat: 34.0522, lng: -118.2437,
      baselines: { pm25: 28, pm10: 55, co2: 440, voc: 100, temperature: 22, humidity: 40 },
    },
    'london': {
      label: '📍 London, UK',
      lat: 51.5074, lng: -0.1278,
      baselines: { pm25: 15, pm10: 30, co2: 420, voc: 65, temperature: 14, humidity: 72 },
    },
    'tokyo': {
      label: '📍 Tokyo, Japan',
      lat: 35.6762, lng: 139.6503,
      baselines: { pm25: 18, pm10: 38, co2: 430, voc: 70, temperature: 20, humidity: 60 },
    },
    'sydney': {
      label: '📍 Sydney, Australia',
      lat: -33.8688, lng: 151.2093,
      baselines: { pm25: 12, pm10: 25, co2: 410, voc: 50, temperature: 22, humidity: 55 },
    },
  };

  // State for each location
  let state = {};
  let currentLocation = 'new-delhi';
  let historicalData = {};

  /**
   * Initialize state for all locations
   */
  function init() {
    Object.keys(LOCATIONS).forEach(loc => {
      state[loc] = {};
      historicalData[loc] = [];

      const baselines = LOCATIONS[loc].baselines || {};

      Object.keys(POLLUTANTS).forEach(key => {
        // Start each city at its specific baseline value
        const baseline = baselines[key];
        const p = POLLUTANTS[key];
        const startVal = baseline !== undefined ? baseline : (p.baseRange[0] + p.baseRange[1]) / 2;

        state[loc][key] = {
          value: startVal,
          velocity: 0,
          lastSpike: 0,
        };
      });

      // Generate 7 days of historical data
      generateHistorical(loc);
    });
  }

  /**
   * Generate historical data for a location
   */
  function generateHistorical(loc) {
    const now = new Date();
    const msPerReading = 30000;
    const totalReadings = (7 * 24 * 60 * 60 * 1000) / msPerReading;
    const baselines = LOCATIONS[loc].baselines || {};
    const tempState = {};

    Object.keys(POLLUTANTS).forEach(key => {
      const p = POLLUTANTS[key];
      const startVal = baselines[key] !== undefined ? baselines[key] : (p.baseRange[0] + p.baseRange[1]) / 2;
      tempState[key] = { value: startVal, velocity: 0, lastSpike: 0 };
    });

    const step = 30;
    for (let i = totalReadings; i >= 0; i -= step) {
      const timestamp = new Date(now.getTime() - i * msPerReading);
      const reading = generateReading(tempState, timestamp, loc);
      historicalData[loc].push({ timestamp, ...reading });
    }
  }

  /**
   * Generate a single reading based on current state and city baselines
   */
  function generateReading(st, timestamp, loc) {
    const hour = timestamp.getHours() + timestamp.getMinutes() / 60;
    const baselines = LOCATIONS[loc]?.baselines || {};
    const result = {};

    Object.keys(POLLUTANTS).forEach(key => {
      const p = POLLUTANTS[key];
      const baseline = baselines[key];
      const s = st[key];

      // Use city-specific baseline as the center point
      const center = baseline !== undefined ? baseline : (p.baseRange[0] + p.baseRange[1]) / 2;

      // Diurnal pattern: peaks at 8am and 6pm (rush hours), lowest at 3am
      // Amplitude is proportional to the city's baseline (polluted cities swing more)
      const ampFactor = Math.max(center * 0.12, p.diurnalAmplitude * 0.3);
      const diurnal = ampFactor *
        (0.5 * Math.sin((hour - 3) * Math.PI / 12) +
          0.3 * Math.sin((hour - 7) * Math.PI / 6));

      // Random walk with mean reversion TOWARD city baseline
      const meanReversion = (center - s.value) * 0.025;
      const noiseRange = center * 0.04; // noise proportional to baseline
      const noise = Utils.random(-1, 1) * noiseRange;

      // Occasional spikes (more likely in polluted cities)
      let spike = 0;
      s.lastSpike++;
      const spikeChance = center > 50 ? 0.006 : 0.003;
      if (s.lastSpike > 80 && Math.random() < spikeChance) {
        spike = Utils.random(0.2, 0.5) * center;
        s.lastSpike = 0;
      }

      // Apply velocity with damping
      s.velocity = s.velocity * 0.85 + meanReversion + noise + spike * 0.15;

      // Value stays within realistic range around the city baseline
      const floor = center * 0.4;
      const ceiling = center * 2.2;
      s.value = Utils.clamp(s.value + s.velocity + diurnal * 0.05, floor, ceiling);

      result[key] = Math.round(s.value * 100) / 100;
    });

    // Correlations: humidity affects PM, temperature affects VOC
    if (result.humidity && result.pm25) {
      result.pm25 = Utils.clamp(
        result.pm25 * (1 + (result.humidity - 50) * 0.002),
        (baselines.pm25 || 10) * 0.3,
        (baselines.pm25 || 50) * 3
      );
    }
    if (result.temperature && result.voc) {
      result.voc = Utils.clamp(
        result.voc * (1 + (result.temperature - 25) * 0.015),
        (baselines.voc || 50) * 0.3,
        (baselines.voc || 100) * 3
      );
    }

    return result;
  }

  /**
   * Get the next real-time reading
   */
  function getReading() {
    const loc = currentLocation;
    const now = new Date();
    const reading = generateReading(state[loc], now, loc);

    const dataPoint = { timestamp: now, ...reading };
    historicalData[loc].push(dataPoint);

    // Keep only last 7 days
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    while (historicalData[loc].length > 0 && historicalData[loc][0].timestamp < cutoff) {
      historicalData[loc].shift();
    }

    return dataPoint;
  }

  /**
   * Get historical data for current location
   */
  function getHistory(hours = 24) {
    const loc = currentLocation;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return (historicalData[loc] || []).filter(d => d.timestamp >= cutoff);
  }

  /**
   * Get all historical data for current location
   */
  function getAllHistory() {
    return historicalData[currentLocation] || [];
  }

  /**
   * Set active location
   */
  function setLocation(loc) {
    if (LOCATIONS[loc]) {
      currentLocation = loc;
    }
  }

  function getLocation() {
    return currentLocation;
  }

  function getPollutantConfig(key) {
    return POLLUTANTS[key];
  }

  function getPollutantKeys() {
    return Object.keys(POLLUTANTS);
  }

  function getLocations() {
    return { ...LOCATIONS };
  }

  /**
   * Get city baseline values for current location
   */
  function getBaselines(loc) {
    return LOCATIONS[loc || currentLocation]?.baselines || {};
  }

  /**
   * Find the nearest predefined location to given GPS coordinates
   */
  function getNearestLocation(lat, lng) {
    let nearest = null;
    let minDist = Infinity;

    Object.entries(LOCATIONS).forEach(([key, loc]) => {
      if (loc.lat === undefined || loc.lng === undefined) return;
      const dLat = (loc.lat - lat) * Math.PI / 180;
      const dLng = (loc.lng - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 6371;
      if (dist < minDist) {
        minDist = dist;
        nearest = key;
      }
    });

    return { key: nearest, distance: minDist };
  }

  /**
   * Dynamically add a custom location
   */
  function addCustomLocation(key, label, lat, lng, baselines = {}) {
    const defaults = { pm25: 30, pm10: 60, co2: 450, voc: 90, temperature: 25, humidity: 55 };
    LOCATIONS[key] = {
      label: `📍 ${label}`,
      lat, lng,
      baselines: { ...defaults, ...baselines },
    };

    state[key] = {};
    historicalData[key] = [];
    const bl = LOCATIONS[key].baselines;
    Object.keys(POLLUTANTS).forEach(pk => {
      state[key][pk] = { value: bl[pk] || 50, velocity: 0, lastSpike: 0 };
    });
    generateHistorical(key);
  }

  return {
    POLLUTANTS,
    LOCATIONS,
    init,
    getReading,
    getHistory,
    getAllHistory,
    setLocation,
    getLocation,
    getPollutantConfig,
    getPollutantKeys,
    getLocations,
    getBaselines,
    getNearestLocation,
    addCustomLocation,
  };
})();
