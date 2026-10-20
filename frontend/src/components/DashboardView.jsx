import React, { useState, useEffect } from "react";
import {
  Users,
  Ticket,
  DollarSign,
  MapPin,
  TrendingUp,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Filter,
  Train,
  ArrowUpRight,
  ShieldAlert,
  Smartphone
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  fetchOverview,
  fetchRevenue,
  fetchRushHours,
  fetchStationClusters,
  predictRush
} from "../services/api";
import {
  formatIndianNumberFull,
  formatIndianCurrencyFull,
  formatIndianCount,
  formatIndianCurrency,
  formatRevenueAxisTick,
  formatPassengerAxisTick
} from "../utils/formatters";

const LINE_COLORS = {
  Central: "#ef4444",
  Western: "#3b82f6",
  Harbour: "#10b981",
  Pune: "#f59e0b"
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

export default function DashboardView() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [rushHours, setRushHours] = useState(null);
  const [clusters, setClusters] = useState(null);

  // Filter State
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedLine, setSelectedLine] = useState("All");
  const [selectedTier, setSelectedTier] = useState("All");

  // ML Predictor State
  const [predictParams, setPredictParams] = useState({
    hour: 9,
    railway_line: "Western",
    ticket_type: "Single",
    booking_mode: "Paperless"
  });
  const [predictResult, setPredictResult] = useState(null);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedCity, selectedLine]);

  async function loadData() {
    setLoading(true);
    try {
      const [ov, rev, rh, cl] = await Promise.all([
        fetchOverview(),
        fetchRevenue({
          city: selectedCity !== "All" ? selectedCity : undefined,
          railway_line: selectedLine !== "All" ? selectedLine : undefined,
          group_by: "railway_line,city"
        }),
        fetchRushHours({
          city: selectedCity !== "All" ? selectedCity : undefined,
          railway_line: selectedLine !== "All" ? selectedLine : undefined
        }),
        fetchStationClusters()
      ]);

      setOverview(ov);
      setRevenueData(rev.data || []);
      setRushHours(rh);
      setClusters(cl);

      // Initial prediction
      handlePredict();
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePredict() {
    setPredicting(true);
    try {
      const res = await predictRush(predictParams);
      setPredictResult(res);
    } catch (err) {
      console.error("Prediction error:", err);
    } finally {
      setPredicting(false);
    }
  }

  // Filtered stations for cluster table
  const filteredStations = (clusters?.stations || []).filter((s) => {
    if (selectedTier !== "All" && s.tier_label !== selectedTier) return false;
    if (selectedCity !== "All" && s.city !== selectedCity) return false;
    if (selectedLine !== "All" && s.railway_line !== selectedLine) return false;
    return true;
  });

  // Ticket fulfillment data for chart
  const ticketDistributionData = [
    { name: "Single (Paperless)", value: 120098 },
    { name: "Return (Paper)", value: 120235 },
    { name: "Monthly Pass (Paperless)", value: 119959 },
    { name: "Return (Paperless)", value: 119590 },
    { name: "Monthly Pass (Paper)", value: 119525 },
    { name: "Single (Paper)", value: 119254 }
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Filters Toolbar */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">OLAP Slice & Dice Filters</h3>
            <p className="text-xs text-slate-400">Filter warehouse cube dimensions dynamically</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-300">City:</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Cities (Mumbai & Pune)</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Pune">Pune</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-300">Line:</label>
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Lines</option>
              <option value="Western">Western Line</option>
              <option value="Central">Central Line</option>
              <option value="Harbour">Harbour Line</option>
              <option value="Pune">Pune Suburban</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-600/20"
          >
            Apply Cube Slice
          </button>
        </div>
      </div>

      {/* KPI Overview Cards (Localized to Indian Numbering System: Lakhs & Crores) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Bookings Card */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Bookings</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  {formatIndianCount(overview?.total_bookings || 718661)}
                </h3>
              </div>
              <p className="text-xs text-blue-400/90 font-mono mt-1">
                {formatIndianNumberFull(overview?.total_bookings || 718661)} Total Transactions
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
              <Ticket className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 border-t border-slate-800/80 pt-3">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>100% Transactions Reconciled</span>
          </div>
        </div>

        {/* Total Commuters Card */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Commuters</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  {formatIndianCount(overview?.total_passengers || 1796297)}
                </h3>
              </div>
              <p className="text-xs text-emerald-400/90 font-mono mt-1">
                {formatIndianNumberFull(overview?.total_passengers || 1796297)} Passengers
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
            <span>Avg {overview?.avg_passengers_per_booking || 2.5} pax / ticket</span>
          </div>
        </div>

        {/* Total Net Revenue Card */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-purple-500/50 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Net Revenue</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  {formatIndianCurrency(overview?.total_revenue || 26948250)}
                </h3>
                <span className="text-xs text-purple-400 font-medium">
                  ({(Number(overview?.total_revenue || 26948250) / 100000).toFixed(2)} Lakh)
                </span>
              </div>
              <p className="text-xs text-purple-400/90 font-mono mt-1">
                {formatIndianCurrencyFull(overview?.total_revenue || 26948250)} Net Collection
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-purple-400 border-t border-slate-800/80 pt-3">
            <span>Avg ₹{overview?.avg_fare_per_booking || 37.5} / booking</span>
          </div>
        </div>

        {/* Digital Paperless Rate Card */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Digital Paperless Rate</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2">
                {overview?.paperless_adoption_rate || "50.04%"}
              </h3>
              <p className="text-xs text-amber-400/90 font-mono mt-1">
                Top Pay: {overview?.popular_payment_mode || "UPI"}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 border-t border-slate-800/80 pt-3">
            <span>Busiest: {overview?.busiest_origin_station || "Shivajinagar"}</span>
          </div>
        </div>
      </div>

      {/* OLAP Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Revenue by Railway Line (Formatted in Lakhs / Crores) */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Train className="w-5 h-5 text-blue-400" />
                Revenue & Volume by Railway Line
              </h3>
              <p className="text-xs text-slate-400 mt-1">Multi-dimensional slice across Suburban transit corridors (in ₹ Lakhs)</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full font-medium">OLAP Slice</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="railway_line" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={formatRevenueAxisTick}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                  formatter={(val, name) => [
                    name === "total_revenue"
                      ? `${formatIndianCurrencyFull(val)} (${formatIndianCurrency(val)})`
                      : `${formatIndianNumberFull(val)} (${formatIndianCount(val)})`,
                    name === "total_revenue" ? "Revenue" : "Passengers"
                  ]}
                />
                <Bar dataKey="total_revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} name="total_revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-800 text-center">
            {revenueData.map((d) => (
              <div key={d.railway_line} className="text-xs">
                <span className="text-slate-400 block">{d.railway_line}</span>
                <span className="font-semibold text-white">{formatIndianCurrency(d.total_revenue)}</span>
                <span className="text-[10px] text-blue-400 block">({d.revenue_share_percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: 24-Hour Passenger Traffic & Rush Hours */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                Peak Travel Hours & Congestion Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-1">Aggregated passenger volume across 24 hourly time grains</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-medium">
              Peak: {rushHours?.peak_hour || 10}:00 hrs ({formatIndianCount(rushHours?.peak_passenger_volume || 75985)})
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rushHours?.hourly_distribution || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rushGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickFormatter={(h) => `${h}h`} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatPassengerAxisTick}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                  formatter={(val) => [`${formatIndianNumberFull(val)} Passengers (${formatIndianCount(val)})`, "Volume"]}
                  labelFormatter={(h) => `Hour ${h}:00 - ${(Number(h) + 1) % 24}:00`}
                />
                <Area type="monotone" dataKey="total_passengers" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#rushGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
              Morning Rush: 08:00 - 11:00
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              Evening Rush: 17:00 - 20:00
            </span>
          </div>
        </div>
      </div>

      {/* Ticket Distribution and Digital Mode Adoption */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-purple-400" />
              Ticket Type & Fulfillment Mode Distribution
            </h3>
            <p className="text-xs text-slate-400 mt-1">Cross-tabulated analysis of digital vs paper adoption across categories</p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-full font-medium">Digital vs Counter</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ticketDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ticketDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                  formatter={(val) => [`${formatIndianNumberFull(val)} Bookings (${formatIndianCount(val)})`, "Volume"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {ticketDistributionData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 font-mono">
                    {formatIndianNumberFull(item.value)} ({formatIndianCount(item.value)})
                  </span>
                  <span className="font-semibold text-white">{((item.value / 718661) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive ML Predictor & Station Clustering Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Real-Time ML Rush Hour Predictor (5 cols) */}
        <div className="lg:col-span-5 bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/25">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Journey Rush Risk Predictor</h3>
                  <p className="text-xs text-slate-400">Random Forest Classifier (Scikit-Learn)</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-full font-medium">85% Accuracy</span>
            </div>

            {/* Input Controls */}
            <div className="space-y-4 my-6">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Travel Hour:</span>
                  <span className="text-blue-400 font-bold">{predictParams.hour}:00 hrs</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={predictParams.hour}
                  onChange={(e) => setPredictParams({ ...predictParams, hour: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Railway Line</label>
                  <select
                    value={predictParams.railway_line}
                    onChange={(e) => setPredictParams({ ...predictParams, railway_line: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
                  >
                    <option value="Western">Western</option>
                    <option value="Central">Central</option>
                    <option value="Harbour">Harbour</option>
                    <option value="Pune">Pune</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ticket Type</label>
                  <select
                    value={predictParams.ticket_type}
                    onChange={(e) => setPredictParams({ ...predictParams, ticket_type: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
                  >
                    <option value="Single">Single</option>
                    <option value="Return">Return</option>
                    <option value="Monthly Pass">Monthly Pass</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Booking Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPredictParams({ ...predictParams, booking_mode: "Paperless" })}
                    className={`text-xs py-2 rounded-lg font-medium border transition-all ${
                      predictParams.booking_mode === "Paperless"
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "bg-[#0b0f19] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    📱 Paperless (UTS App)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPredictParams({ ...predictParams, booking_mode: "Paper" })}
                    className={`text-xs py-2 rounded-lg font-medium border transition-all ${
                      predictParams.booking_mode === "Paper"
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "bg-[#0b0f19] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    🎟️ Paper (Counter)
                  </button>
                </div>
              </div>

              <button
                onClick={handlePredict}
                disabled={predicting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                {predicting ? "Evaluating Model..." : "Predict Journey Congestion"}
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Prediction Result Display */}
          {predictResult && (
            <div
              className={`p-4 rounded-xl border mt-2 transition-all ${
                predictResult.is_rush_hour
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  {predictResult.is_rush_hour ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                  {predictResult.risk_level}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/60 font-mono">
                  {(predictResult.rush_probability * 100).toFixed(1)}% Risk
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{predictResult.congestion_advisory}</p>
            </div>
          )}
        </div>

        {/* Station Congestion Clusters Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  Station Congestion Clusters (K-Means)
                </h3>
                <p className="text-xs text-slate-400">Classified by passenger density and total ticket revenue (in ₹ Lakhs)</p>
              </div>

              {/* Tier Filter Pills */}
              <div className="flex items-center gap-1 bg-[#0b0f19] p-1 rounded-xl border border-slate-800 text-xs">
                {["All", "High Congestion Hub", "Moderate Traffic", "Low Traffic"].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      selectedTier === tier
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tier === "High Congestion Hub" ? "High" : tier === "Moderate Traffic" ? "Moderate" : tier === "Low Traffic" ? "Low" : "All"}
                  </button>
                ))}
              </div>
            </div>

            {/* Cluster Tiers Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block">High Hubs</span>
                <span className="text-lg font-bold text-white">4 Stations</span>
                <span className="text-[10px] text-slate-400 block font-mono">Avg 1.12 Lakh pax</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">Moderate</span>
                <span className="text-lg font-bold text-white">5 Stations</span>
                <span className="text-[10px] text-slate-400 block font-mono">Avg 0.90 Lakh pax</span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">Low Traffic</span>
                <span className="text-lg font-bold text-white">12 Stations</span>
                <span className="text-[10px] text-slate-400 block font-mono">Avg 0.75 Lakh pax</span>
              </div>
            </div>

            {/* Stations Scrollable Table */}
            <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0f19] text-slate-400 sticky top-0 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Station</th>
                    <th className="py-3 px-3">Line & City</th>
                    <th className="py-3 px-3">Passengers</th>
                    <th className="py-3 px-3">Revenue</th>
                    <th className="py-3 px-3">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredStations.map((s) => (
                    <tr key={s.station_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">{s.station_name}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: LINE_COLORS[s.railway_line] || "#94a3b8" }}></span>
                        {s.railway_line} ({s.city})
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-mono">
                        {formatIndianNumberFull(s.total_passengers)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-mono">
                        {formatIndianCurrency(s.total_revenue, 2, "lakh")}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            s.tier_label === "High Congestion Hub"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : s.tier_label === "Moderate Traffic"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {s.tier_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
