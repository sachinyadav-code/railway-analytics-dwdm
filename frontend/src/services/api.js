/**
 * API Service for UTS Suburban Railway Analytics
 * Connects to FastAPI backend with automatic graceful fallbacks.
 */

import { API_BASE } from "../config";

// Fallback data for offline / presentation reliability
const FALLBACK_OVERVIEW = {
  total_bookings: 718661,
  total_passengers: 1796297,
  total_revenue: 26948250,
  total_stations: 21,
  total_railway_lines: 4,
  total_cities: 2,
  avg_fare_per_booking: 37.5,
  avg_passengers_per_booking: 2.5,
  popular_payment_mode: "UPI",
  popular_ticket_type: "Return",
  paperless_adoption_rate: "50.04%",
  busiest_origin_station: "Shivajinagar (Pune)"
};

const FALLBACK_REVENUE = {
  filters_applied: {},
  grouped_by: ["railway_line", "city"],
  total_revenue_overall: 26948250,
  total_bookings_overall: 718661,
  data: [
    { railway_line: "Central", city: "Mumbai", total_bookings: 179744, total_passengers: 448453, total_revenue: 6758130, avg_fare_per_booking: 37.60, revenue_share_percentage: 25.08 },
    { railway_line: "Western", city: "Mumbai", total_bookings: 180436, total_passengers: 451420, total_revenue: 6752025, avg_fare_per_booking: 37.42, revenue_share_percentage: 25.06 },
    { railway_line: "Pune", city: "Pune", total_bookings: 179599, total_passengers: 448727, total_revenue: 6734640, avg_fare_per_booking: 37.50, revenue_share_percentage: 24.99 },
    { railway_line: "Harbour", city: "Mumbai", total_bookings: 178882, total_passengers: 447697, total_revenue: 6703455, avg_fare_per_booking: 37.47, revenue_share_percentage: 24.88 }
  ]
};

const FALLBACK_RUSH_HOURS = {
  city_filter: null,
  line_filter: null,
  peak_hour: 10,
  peak_passenger_volume: 75985,
  lowest_hour: 3,
  hourly_distribution: [
    { hour: 0, time_window: "00:00 - 01:00", total_bookings: 29584, total_passengers: 74210, total_revenue: 1112400, is_rush_hour: false, rush_level: "LOW" },
    { hour: 1, time_window: "01:00 - 02:00", total_bookings: 29790, total_passengers: 74612, total_revenue: 1118250, is_rush_hour: false, rush_level: "LOW" },
    { hour: 2, time_window: "02:00 - 03:00", total_bookings: 29807, total_passengers: 74810, total_revenue: 1121100, is_rush_hour: false, rush_level: "LOW" },
    { hour: 3, time_window: "03:00 - 04:00", total_bookings: 29543, total_passengers: 73990, total_revenue: 1109150, is_rush_hour: false, rush_level: "LOW" },
    { hour: 4, time_window: "04:00 - 05:00", total_bookings: 30259, total_passengers: 75550, total_revenue: 1133205, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 5, time_window: "05:00 - 06:00", total_bookings: 29628, total_passengers: 74310, total_revenue: 1114500, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 6, time_window: "06:00 - 07:00", total_bookings: 29972, total_passengers: 75010, total_revenue: 1124100, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 7, time_window: "07:00 - 08:00", total_bookings: 29872, total_passengers: 74900, total_revenue: 1122300, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 8, time_window: "08:00 - 09:00", total_bookings: 30066, total_passengers: 75420, total_revenue: 1129800, is_rush_hour: true, rush_level: "PEAK" },
    { hour: 9, time_window: "09:00 - 10:00", total_bookings: 30013, total_passengers: 75210, total_revenue: 1126500, is_rush_hour: true, rush_level: "PEAK" },
    { hour: 10, time_window: "10:00 - 11:00", total_bookings: 30183, total_passengers: 75985, total_revenue: 1134825, is_rush_hour: true, rush_level: "PEAK" },
    { hour: 11, time_window: "11:00 - 12:00", total_bookings: 30122, total_passengers: 75105, total_revenue: 1134840, is_rush_hour: true, rush_level: "PEAK" },
    { hour: 12, time_window: "12:00 - 13:00", total_bookings: 30071, total_passengers: 75150, total_revenue: 1128000, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 13, time_window: "13:00 - 14:00", total_bookings: 30017, total_passengers: 75080, total_revenue: 1126100, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 14, time_window: "14:00 - 15:00", total_bookings: 30056, total_passengers: 75120, total_revenue: 1127000, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 15, time_window: "15:00 - 16:00", total_bookings: 30202, total_passengers: 75582, total_revenue: 1125585, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 16, time_window: "16:00 - 17:00", total_bookings: 30116, total_passengers: 75310, total_revenue: 1130100, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 17, time_window: "17:00 - 18:00", total_bookings: 29906, total_passengers: 74850, total_revenue: 1123100, is_rush_hour: true, rush_level: "PEAK" },
    { hour: 18, time_window: "18:00 - 19:00", total_bookings: 29548, total_passengers: 73920, total_revenue: 1109800, is_rush_hour: true, rush_level: "PEAK" },
    { hour: 19, time_window: "19:00 - 20:00", total_bookings: 30044, total_passengers: 75200, total_revenue: 1128000, is_rush_hour: true, rush_level: "PEAK" },
    { hour: 20, time_window: "20:00 - 21:00", total_bookings: 29717, total_passengers: 74300, total_revenue: 1116000, is_rush_hour: true, rush_level: "PEAK" },
    { hour: 21, time_window: "21:00 - 22:00", total_bookings: 30097, total_passengers: 75300, total_revenue: 1129000, is_rush_hour: false, rush_level: "MODERATE" },
    { hour: 22, time_window: "22:00 - 23:00", total_bookings: 29908, total_passengers: 74800, total_revenue: 1122000, is_rush_hour: false, rush_level: "LOW" },
    { hour: 23, time_window: "23:00 - 00:00", total_bookings: 30140, total_passengers: 75358, total_revenue: 1135800, is_rush_hour: false, rush_level: "LOW" }
  ]
};

const FALLBACK_CLUSTERS = {
  n_clusters: 3,
  clusters_summary: [
    { cluster_id: 1, tier_label: "High Congestion Hub", station_count: 4, avg_passengers: 112181.75, avg_revenue: 1683656.25, stations_included: ["Shivajinagar", "Akurdi", "Pune Jn", "Khadki"] },
    { cluster_id: 2, tier_label: "Moderate Traffic", station_count: 5, avg_passengers: 89539.4, avg_revenue: 1342617.0, stations_included: ["Wadala", "Vashi", "Kurla", "Panvel", "CST"] },
    { cluster_id: 0, tier_label: "Low Traffic", station_count: 12, avg_passengers: 74989.42, avg_revenue: 1125741.25, stations_included: ["Churchgate", "Andheri", "Virar", "Thane", "CST", "Dadar", "Marine Lines", "Borivali", "Byculla", "Kalyan", "Kurla"] }
  ],
  stations: [
    { station_id: 21, station_name: "Shivajinagar", railway_line: "Pune", city: "Pune", total_departures: 45200, total_passengers: 113231, total_revenue: 1707525, cluster_id: 1, tier_label: "High Congestion Hub" },
    { station_id: 18, station_name: "Akurdi", railway_line: "Pune", city: "Pune", total_departures: 44736, total_passengers: 112263, total_revenue: 1681590, cluster_id: 1, tier_label: "High Congestion Hub" },
    { station_id: 20, station_name: "Pune Jn", railway_line: "Pune", city: "Pune", total_departures: 44987, total_passengers: 111899, total_revenue: 1681320, cluster_id: 1, tier_label: "High Congestion Hub" },
    { station_id: 19, station_name: "Khadki", railway_line: "Pune", city: "Pune", total_departures: 44676, total_passengers: 111334, total_revenue: 1664205, cluster_id: 1, tier_label: "High Congestion Hub" },
    { station_id: 11, station_name: "Wadala", railway_line: "Harbour", city: "Mumbai", total_departures: 35983, total_passengers: 90078, total_revenue: 1348875, cluster_id: 2, tier_label: "Moderate Traffic" },
    { station_id: 10, station_name: "Vashi", railway_line: "Harbour", city: "Mumbai", total_departures: 35967, total_passengers: 90059, total_revenue: 1353285, cluster_id: 2, tier_label: "Moderate Traffic" },
    { station_id: 8, station_name: "Kurla", railway_line: "Harbour", city: "Mumbai", total_departures: 35899, total_passengers: 89899, total_revenue: 1347060, cluster_id: 2, tier_label: "Moderate Traffic" },
    { station_id: 9, station_name: "Panvel", railway_line: "Harbour", city: "Mumbai", total_departures: 35579, total_passengers: 88914, total_revenue: 1332975, cluster_id: 2, tier_label: "Moderate Traffic" },
    { station_id: 7, station_name: "CST", railway_line: "Harbour", city: "Mumbai", total_departures: 35454, total_passengers: 88747, total_revenue: 1321260, cluster_id: 2, tier_label: "Moderate Traffic" },
    { station_id: 14, station_name: "Churchgate", railway_line: "Western", city: "Mumbai", total_departures: 30336, total_passengers: 75898, total_revenue: 1137000, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 12, station_name: "Andheri", railway_line: "Western", city: "Mumbai", total_departures: 30238, total_passengers: 75627, total_revenue: 1132680, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 17, station_name: "Virar", railway_line: "Western", city: "Mumbai", total_departures: 30147, total_passengers: 75386, total_revenue: 1129485, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 6, station_name: "Thane", railway_line: "Central", city: "Mumbai", total_departures: 30140, total_passengers: 75351, total_revenue: 1132515, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 2, station_name: "CST", railway_line: "Central", city: "Mumbai", total_departures: 30018, total_passengers: 75022, total_revenue: 1129605, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 3, station_name: "Dadar", railway_line: "Central", city: "Mumbai", total_departures: 30005, total_passengers: 75003, total_revenue: 1126740, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 16, station_name: "Marine Lines", railway_line: "Western", city: "Mumbai", total_departures: 29929, total_passengers: 74900, total_revenue: 1121055, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 15, station_name: "Dadar", railway_line: "Western", city: "Mumbai", total_departures: 29916, total_passengers: 74821, total_revenue: 1121880, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 13, station_name: "Borivali", railway_line: "Western", city: "Mumbai", total_departures: 29870, total_passengers: 74788, total_revenue: 1118880, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 1, station_name: "Byculla", railway_line: "Central", city: "Mumbai", total_departures: 29891, total_passengers: 74776, total_revenue: 1135170, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 4, station_name: "Kalyan", railway_line: "Central", city: "Mumbai", total_departures: 29759, total_passengers: 74208, total_revenue: 1116630, cluster_id: 0, tier_label: "Low Traffic" },
    { station_id: 5, station_name: "Kurla", railway_line: "Central", city: "Mumbai", total_departures: 29931, total_passengers: 74093, total_revenue: 1117470, cluster_id: 0, tier_label: "Low Traffic" }
  ]
};

const FALLBACK_RULES = {
  total_transactions_analyzed: 200000,
  min_support_threshold: 0.05,
  min_confidence_threshold: 0.3,
  total_rules_discovered: 25,
  association_rules: [
    { antecedent: "Payment=Cash", consequent: "Mode=Paper", support: 0.1008, confidence: 0.5046, lift: 1.006, insight: "When 'Payment=Cash' occurs, 'Mode=Paper' is observed 50.5% of the time (Lift: 1.006x)." },
    { antecedent: "Payment=UPI", consequent: "Mode=Paperless", support: 0.1017, confidence: 0.5045, lift: 1.0123, insight: "When 'Payment=UPI' occurs, 'Mode=Paperless' is observed 50.5% of the time (Lift: 1.012x)." },
    { antecedent: "Line=Western", consequent: "Mode=Paperless", support: 0.1261, confidence: 0.5036, lift: 1.0061, insight: "When 'Line=Western' occurs, 'Mode=Paperless' is observed 50.4% of the time (Lift: 1.006x)." },
    { antecedent: "Ticket=Return", consequent: "Mode=Paperless", support: 0.1668, confidence: 0.5002, lift: 1.0012, insight: "Commuters purchasing return tickets frequently use digital paperless passes." }
  ]
};

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchOverview() {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/overview`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback overview data:", err.message);
    return FALLBACK_OVERVIEW;
  }
}

export async function fetchRevenue(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/analytics/revenue?${query}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback revenue data:", err.message);
    return FALLBACK_REVENUE;
  }
}

export async function fetchRushHours(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/analytics/rush-hours?${query}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback rush hours data:", err.message);
    return FALLBACK_RUSH_HOURS;
  }
}

export async function fetchStationClusters() {
  try {
    const res = await fetch(`${API_BASE}/api/mining/station-clusters`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback cluster data:", err.message);
    return FALLBACK_CLUSTERS;
  }
}

export async function predictRush(params) {
  try {
    const res = await fetch(`${API_BASE}/api/mining/predict-rush`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch (err) {
    console.warn("Computing local fallback rush prediction:", err.message);
    const h = parseInt(params.hour, 10);
    const isRush = (h >= 8 && h <= 11) || (h >= 17 && h <= 20);
    const prob = isRush ? 0.87 : 0.05;
    return {
      input_parameters: params,
      is_rush_hour: isRush,
      rush_probability: prob,
      risk_level: isRush ? "CRITICAL RUSH" : "LOW TRAFFIC (OFF-PEAK)",
      congestion_advisory: isRush
        ? `Extreme passenger congestion expected at ${String(h).padStart(2, '0')}:00 on the ${params.railway_line} Line. Boarding delays likely. Opt for digital UTS QR ticketing.`
        : "Off-peak travel conditions. Seating readily available; minimal platform wait times."
    };
  }
}

export async function fetchAssociationRules() {
  try {
    const res = await fetch(`${API_BASE}/api/mining/association-rules`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback association rules:", err.message);
    return FALLBACK_RULES;
  }
}
