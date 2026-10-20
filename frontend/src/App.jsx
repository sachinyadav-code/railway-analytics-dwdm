import React, { useState, useEffect } from "react";
import {
  Train,
  BarChart3,
  GraduationCap,
  Activity,
  RefreshCw,
  Sparkles,
  Server,
  Layers
} from "lucide-react";
import DashboardView from "./components/DashboardView";
import AcademicExplainerView from "./components/AcademicExplainerView";
import { checkBackendHealth } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "academic"
  const [backendOnline, setBackendOnline] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(true);

  useEffect(() => {
    verifyHealth();
    const timer = setInterval(verifyHealth, 10000);
    return () => clearInterval(timer);
  }, []);

  async function verifyHealth() {
    setCheckingHealth(true);
    const online = await checkBackendHealth();
    setBackendOnline(online);
    setCheckingHealth(false);
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Train className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  UTS Suburban Railway Analytics
                </h1>
                <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-mono font-medium">
                  v1.0 Star Schema
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Multidimensional OLAP Cube & Data Mining Engine (Mumbai & Pune Divisions)
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-[#131b2e] p-1 rounded-2xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Operational Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab("academic")}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "academic"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Academic Explainer (Viva)</span>
            </button>
          </div>

          {/* Backend Status Indicator */}
          <div className="hidden lg:flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                backendOnline
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
              title={backendOnline ? "Connected to FastAPI at http://127.0.0.1:8000" : "Offline fallback cache active"}
            >
              <span className={`w-2 h-2 rounded-full ${backendOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
              <span>{backendOnline ? "FastAPI Online" : "Cached Demo Mode"}</span>
            </div>

            <button
              onClick={verifyHealth}
              disabled={checkingHealth}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Refresh connection"
            >
              <RefreshCw className={`w-4 h-4 ${checkingHealth ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" ? <DashboardView /> : <AcademicExplainerView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0b0f19] py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>UTS Suburban Railway Data Warehouse & Data Mining Project</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Warehouse: <code>uts_railway.db</code> (718,661 records)</span>
            <span>•</span>
            <span>FastAPI Backend + React Recharts</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
