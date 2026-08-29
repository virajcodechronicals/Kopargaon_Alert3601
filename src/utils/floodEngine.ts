// Hydrological Flow Direction, Distance & Travel Time Engine for Kopargaon Taluka
// Godavari River Centerline Vector:
// Inlet: 19.8980° N, 74.4600° E -> Old Bridge Gauge: 19.8912° N, 74.4789° E -> Outlet: 19.8820° N, 74.5050° E
// General Flow Bearing: East-South-East (ESE)

export interface RiverPoint {
  lat: number;
  lng: number;
  elevation_m: number;
}

export interface WardRiskVector {
  wardName: string;
  wardNameMr: string;
  elevation_m: number;
  lat: number;
  lng: number;
  distanceFromRiverMeters: number;
  bearingFromBreach: string;
  waveArrivalMinutes: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  statusEn: string;
  statusMr: string;
}

export const GODAVARI_CENTERLINE = [
  { lat: 19.8980, lng: 74.4600, elevation_m: 494.5 }, // Inlet
  { lat: 19.8912, lng: 74.4789, elevation_m: 492.3 }, // Old Bridge Gauge
  { lat: 19.8820, lng: 74.5050, elevation_m: 489.0 }  // Outlet
];

export const KOPARGAON_WARDS = [
  { name: 'Bet Kopargaon', nameMr: 'बेट कोपरगाव', lat: 19.8905, lng: 74.4780, elevation_m: 491.5 },
  { name: 'Kedareshwar Ghats', nameMr: 'केदारेश्वर घाट', lat: 19.8920, lng: 74.4810, elevation_m: 490.8 },
  { name: 'Town Hall', nameMr: 'टाऊन हॉल', lat: 19.8860, lng: 74.4750, elevation_m: 496.0 },
  { name: 'Sanjeevani Campus', nameMr: 'संजीवनी कॅम्पस', lat: 19.8781, lng: 74.4554, elevation_m: 508.0 },
  { name: 'Kolpewadi', nameMr: 'कोल्पेवाडी', lat: 19.9050, lng: 74.4320, elevation_m: 494.0 }
];

// Haversine Distance Calculation (returns meters)
export function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Calculate compass bearing from point 1 to point 2
export function calculateCompassBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;

  if (brng >= 22.5 && brng < 67.5) return 'NE';
  if (brng >= 67.5 && brng < 112.5) return 'E';
  if (brng >= 112.5 && brng < 157.5) return 'ESE';
  if (brng >= 157.5 && brng < 202.5) return 'S';
  if (brng >= 202.5 && brng < 247.5) return 'SW';
  if (brng >= 247.5 && brng < 292.5) return 'W';
  if (brng >= 292.5 && brng < 337.5) return 'NW';
  return 'N';
}

// Minimum distance from a coordinate to the Godavari centerline
export function calculateRiverDistanceAndBearing(lat: number, lng: number): { distanceMeters: number; bearing: string } {
  let minDistance = Infinity;
  let closestPoint = GODAVARI_CENTERLINE[1];

  GODAVARI_CENTERLINE.forEach(pt => {
    const d = calculateHaversineMeters(lat, lng, pt.lat, pt.lng);
    if (d < minDistance) {
      minDistance = d;
      closestPoint = pt;
    }
  });

  const bearing = calculateCompassBearing(closestPoint.lat, closestPoint.lng, lat, lng);
  return { distanceMeters: minDistance, bearing };
}

// Hydrodynamic flood wave velocity and arrival calculations
export function calculateRiverVelocity(totalDischargeCusecs: number): number {
  // Formula: v = max(1.0, (Discharge / 40000) * 2.5) m/s
  return Math.max(1.0, (totalDischargeCusecs / 40000) * 2.5);
}

export function calculateSpatiotemporalWardVectors(
  baseRiverStageM: number = 492.3,
  damDischarges: any[] = [],
  rainForecastMm: number = 20
): WardRiskVector[] {
  const totalDischarge = damDischarges.reduce((acc, d) => acc + (d.discharge_cusecs || 0), 42500);
  const riverVelocity = calculateRiverVelocity(totalDischarge);

  // Projected stage rise based on discharge and local rain
  const dischargeFactor = (totalDischarge / 40000) * 1.8;
  const rainFactor = (rainForecastMm / 50) * 0.4;
  const projectedStageM = baseRiverStageM + dischargeFactor + rainFactor;

  return KOPARGAON_WARDS.map(ward => {
    const { distanceMeters, bearing } = calculateRiverDistanceAndBearing(ward.lat, ward.lng);
    
    // Wave arrival time T = d / v in seconds, converted to minutes
    const waveArrivalSeconds = distanceMeters / riverVelocity;
    const waveArrivalMinutes = Math.max(1, Math.round(waveArrivalSeconds / 60));

    // Inundation risk calculation comparing projected river stage with ward ground elevation
    const elevationDiff = ward.elevation_m - projectedStageM;
    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';

    if (elevationDiff <= 0.2) {
      riskLevel = 'CRITICAL';
    } else if (elevationDiff <= 1.5) {
      riskLevel = 'HIGH';
    } else if (elevationDiff <= 3.5) {
      riskLevel = 'MODERATE';
    }

    let statusEn = `Safe elevation (+${elevationDiff.toFixed(1)}m clear of flood line)`;
    let statusMr = `सुरक्षित उंची (पूर रेषेपासून +${elevationDiff.toFixed(1)}मी वर)`;

    if (riskLevel === 'CRITICAL') {
      statusEn = `INUNDATION IMMINENT (${waveArrivalMinutes} mins arrival). Evacuate to high ground!`;
      statusMr = `पाणी भरण्याचा धोका तात्काळ (${waveArrivalMinutes} मिनिटांत). त्वरित सुरक्षित स्थळी जा!`;
    } else if (riskLevel === 'HIGH') {
      statusEn = `High risk of street waterlogging within ${waveArrivalMinutes + 10} mins. Standby for evacuation.`;
      statusMr = `रस्त्यावर पाणी येण्याची शक्यता (${waveArrivalMinutes + 10} मिनिटांत). स्थलांतराची तयारी ठेवा.`;
    } else if (riskLevel === 'MODERATE') {
      statusEn = `Monitored sector. River discharge wave passing in ~${waveArrivalMinutes + 25} mins.`;
      statusMr = `निरीक्षण सुरू. पुराची लाट ~${waveArrivalMinutes + 25} मिनिटांत पार पडेल.`;
    }

    return {
      wardName: ward.name,
      wardNameMr: ward.nameMr,
      elevation_m: ward.elevation_m,
      lat: ward.lat,
      lng: ward.lng,
      distanceFromRiverMeters: distanceMeters,
      bearingFromBreach: bearing,
      waveArrivalMinutes,
      riskLevel,
      statusEn,
      statusMr
    };
  });
}

export function calculateFloodTimeline(baseLevel: number, damDischarges: any[], rainForecast: number) {
  const timeline = [0, 12, 24, 48, 72];
  const predictions: any[] = [];
  
  timeline.forEach(t => {
    let deltaDamWave = 0;
    damDischarges.forEach(dam => {
      let travelTime = 14;
      if (dam.name.includes('Gangapur')) travelTime = 14;
      if (dam.name.includes('Darna')) travelTime = 18;
      if (dam.name.includes('Nandur')) travelTime = 7;
      if (dam.name.includes('Nilwande')) travelTime = 10;
      if (dam.name.includes('Bhandardara')) travelTime = 12;

      if (t >= travelTime - 6 && t <= travelTime + 12) {
        deltaDamWave += ((dam.discharge_cusecs || 10000) / 10000) * 0.5;
      }
    });

    let deltaRain = (rainForecast / 50) * 0.2;

    const projectedStage = baseLevel + deltaDamWave + deltaRain;
    const isDanger = projectedStage >= 16.50;
    const isWarning = projectedStage >= 14.50;
    
    let risk_level = 'LOW';
    if (isDanger) risk_level = 'CRITICAL';
    else if (isWarning) risk_level = 'HIGH';
    else if (projectedStage >= 12.0) risk_level = 'MODERATE';

    predictions.push({
      timeOffset: t,
      projectedStage: projectedStage.toFixed(2),
      risk_level,
      affected_wards: isDanger ? ['Bet Kopargaon', 'Kedareshwar Temple Ghats'] : (isWarning ? ['Bet Kopargaon'] : []),
      directives_en: isDanger ? 'Mandatory Evacuation. Move to Sanjivani Campus immediately.' : (isWarning ? 'Be prepared to evacuate low-lying areas.' : 'Monitor river levels.'),
      directives_mr: isDanger ? 'तातडीने स्थलांतर करा. संजीवनी कॅम्पसमध्ये जा.' : (isWarning ? 'सखल भागातून स्थलांतराची तयारी ठेवा.' : 'नदीच्या पातळीवर लक्ष ठेवा.')
    });
  });

  return predictions;
}
