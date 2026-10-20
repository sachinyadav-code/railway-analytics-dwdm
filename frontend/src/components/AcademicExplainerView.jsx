import React, { useState, useEffect } from "react";
import {
  Database,
  Cpu,
  Layers,
  GitBranch,
  Network,
  Binary,
  Code2,
  Table,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Sigma,
  Zap,
  Sparkles
} from "lucide-react";
import { fetchAssociationRules } from "../services/api";

export default function AcademicExplainerView() {
  const [associationRules, setAssociationRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);

  useEffect(() => {
    fetchAssociationRules()
      .then((res) => {
        setAssociationRules(res.association_rules || []);
      })
      .catch((err) => console.error("Error loading rules:", err))
      .finally(() => setLoadingRules(false));
  }, []);

  return (
    <div className="space-y-12 pb-20">
      {/* Hero / Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-indigo-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            DWDM Academic Methodology & Viva Reference
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Data Warehouse & Data Mining (DWDM) Architecture
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Comprehensive technical breakdown of the end-to-end engineering lifecycle: Star Schema modeling, Kimball multidimensional OLAP cubing, anomaly handling, and applied machine learning models for suburban transit systems.
          </p>
        </div>
      </div>

      {/* 1. Architecture Pipeline Diagram */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">End-to-End DWDM Pipeline Architecture</h3>
            <p className="text-xs text-slate-400">From raw distributed transaction logs to multidimensional analytics</p>
          </div>
        </div>

        {/* Horizontal Flowchart */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {/* Stage 1 */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 relative group hover:border-blue-500/50 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-2">Stage 01: Raw Ingestion</span>
            <div>
              <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-400" />
                `Uts_Data.csv`
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                7,18,661 raw ticketing records (~7.19 Lakh) spanning Mumbai & Pune transit networks.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300">
              • 14 Raw Attributes<br />
              • Rolling 5-digit PK counters
            </div>
          </div>

          {/* Stage 2 */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 relative group hover:border-indigo-500/50 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-2">Stage 02: Transformation</span>
            <div>
              <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                `etl_pipeline.py`
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated cleaning, whitespace trimming, ISO date casting, and domain anomaly resolution.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300">
              • ₹0 Season pass handling<br />
              • Vectorized `Hour` derivation (0-23)
            </div>
          </div>

          {/* Stage 3 */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 relative group hover:border-purple-500/50 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-2">Stage 03: Warehouse</span>
            <div>
              <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />
                Kimball Star Schema
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Central fact table interconnected with 3 dimension tables via indexed foreign keys.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300">
              • `Fact_Ticket_Bookings` (7.19 Lakh)<br />
              • `Dim_Station`, `Dim_Time`, `Dim_Ticket`
            </div>
          </div>

          {/* Stage 4 */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 relative group hover:border-emerald-500/50 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-2">Stage 04: Analytics & Mining</span>
            <div>
              <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Binary className="w-4 h-4 text-emerald-400" />
                FastAPI + ML Engine
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                REST service serving dynamic OLAP slice & dice and cached data mining inference.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300">
              • Random Forest & K-Means<br />
              • Apriori Frequent Itemsets
            </div>
          </div>

          {/* Stage 5 */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 relative group hover:border-amber-500/50 transition-all flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-2">Stage 05: Presentation</span>
            <div>
              <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                React Dashboard
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Executive operational monitoring and interactive simulation dashboard.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300">
              • Real-time rush predictor<br />
              • Station cluster visualization
            </div>
          </div>
        </div>
      </div>

      {/* 2. Data Mining Algorithms Breakdown */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
            <Binary className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Data Mining Algorithms Breakdown</h3>
            <p className="text-xs text-slate-400">Formal mathematical formulations and experimental findings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Algorithm 1: Classification (Random Forest) */}
          <div className="bg-[#131b2e] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full uppercase tracking-wider">
                  Supervised Learning
                </span>
                <span className="text-xs text-slate-400 font-mono">Accuracy: ~85%</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">1. Classification: Random Forest</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Ensemble of B randomized Decision Trees voting on whether a commuter journey encounters peak-rush congestion based on time of day, corridor, and ticketing mode.
              </p>

              {/* Math Formulation */}
              <div className="bg-[#0b0f19] border border-slate-800/80 rounded-xl p-3.5 text-xs font-mono text-indigo-300 mb-4 space-y-1">
                <p className="text-slate-400 font-sans text-[11px]">Ensemble Probability:</p>
                <p>P(Rush | X) = (1/B) * Σ I(f_b(X) = 1)</p>
                <p className="text-slate-400 font-sans text-[11px] mt-1.5">Decision Rule:</p>
                <p>ŷ = 1 if P(Rush | X) ≥ 0.50 else 0</p>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Features:</strong> `Hour` (numeric), `Railway_Line`, `Ticket_Type`, `Booking_Mode` (one-hot).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Transit Impact:</strong> Proactive passenger flow advisory and crowd management before station bottlenecks occur.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Algorithm 2: Clustering (K-Means) */}
          <div className="bg-[#131b2e] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-full uppercase tracking-wider">
                  Unsupervised Learning
                </span>
                <span className="text-xs text-slate-400 font-mono">k = 3 Tiers</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">2. Clustering: K-Means Segmentation</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Partitions all 21 suburban railway station nodes into 3 natural congestion clusters by optimizing Within-Cluster Sum of Squares (WCSS).
              </p>

              {/* Math Formulation */}
              <div className="bg-[#0b0f19] border border-slate-800/80 rounded-xl p-3.5 text-xs font-mono text-purple-300 mb-4 space-y-1">
                <p className="text-slate-400 font-sans text-[11px]">Objective Function:</p>
                <p>J = Σ_(j=1)^k Σ_(x ∈ S_j) ||x - μ_j||²</p>
                <p className="text-slate-400 font-sans text-[11px] mt-1.5">Feature Normalization:</p>
                <p>z = (x - μ) / σ (StandardScaler)</p>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Cluster 1 (High Hubs):</strong> Pune Suburban nodes (Shivajinagar, Akurdi, Pune Jn, Khadki; ~1.12 Lakh pax).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Cluster 2 (Moderate):</strong> Harbour Line interchanges (Wadala, Vashi, Kurla, Panvel, CST; ~0.90 Lakh pax).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Cluster 3 (Low Traffic):</strong> Western & Central suburban lines (~0.75 Lakh pax).</span>
                </div>
              </div>
            </div>
          </div>

          {/* Algorithm 3: Association Rules (Apriori) */}
          <div className="bg-[#131b2e] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full uppercase tracking-wider">
                  Pattern Mining
                </span>
                <span className="text-xs text-slate-400 font-mono">25 Rules Mined</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">3. Association Rules: Apriori Logic</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Discovers frequent itemsets and affinity rules between ticketing types, physical vs digital modes, and payment methods.
              </p>

              {/* Math Formulation */}
              <div className="bg-[#0b0f19] border border-slate-800/80 rounded-xl p-3.5 text-xs font-mono text-amber-300 mb-4 space-y-1">
                <p className="text-slate-400 font-sans text-[11px]">Support:</p>
                <p>Supp(A ⇒ B) = P(A ∩ B)</p>
                <p className="text-slate-400 font-sans text-[11px] mt-1">Confidence & Lift:</p>
                <p>Conf(A ⇒ B) = P(B|A)</p>
                <p>Lift(A ⇒ B) = Conf(A ⇒ B) / P(B)</p>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>UPI ➔ Paperless:</strong> Conf 50.5%, Lift 1.012x (Strong correlation of UPI payments with app QR adoption).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Cash ➔ Paper:</strong> Conf 50.5%, Lift 1.006x (Physical cash transactions predominantly use physical counters).</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Association Rules Live Inspection Table */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-3xl p-6 shadow-xl mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Live Discovered Association Rules (from `uts_railway.db`)
              </h4>
              <p className="text-xs text-slate-400">Rules with Support ≥ 0.05 and Confidence ≥ 0.30</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Sample: 2,00,000 transactions (2.0 Lakh)</span>
          </div>

          <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f19] text-slate-400 sticky top-0 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Antecedent (A)</th>
                  <th className="py-2.5 px-3">Consequent (B)</th>
                  <th className="py-2.5 px-3">Support</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Lift</th>
                  <th className="py-2.5 px-3">Actionable Domain Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {associationRules.slice(0, 6).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono text-blue-400">{r.antecedent}</td>
                    <td className="py-2 px-3 font-mono text-emerald-400">{r.consequent}</td>
                    <td className="py-2 px-3">{r.support}</td>
                    <td className="py-2 px-3">{(r.confidence * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 font-bold text-purple-400">{r.lift}x</td>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">{r.insight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. OLAP Operations Mapping */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <Table className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Multidimensional OLAP Operations in Suburban Transit</h3>
            <p className="text-xs text-slate-400">Formal mapping of OLAP cube navigation primitives to relational SQL queries</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Roll-Up */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Aggregation</span>
              <h4 className="text-sm font-bold text-white mb-2">1. Roll-Up (Climb Hierarchy)</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Summarizes low-level atomic records into higher conceptual levels:
              </p>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-emerald-300 mb-3">
                Station ➔ Line ➔ City ➔ Network Total
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              `GROUP BY city, railway_line`
            </p>
          </div>

          {/* Drill-Down */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 hover:border-blue-500/50 transition-all flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">De-aggregation</span>
              <h4 className="text-sm font-bold text-white mb-2">2. Drill-Down (Add Granularity)</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Breaks down high-level annual or monthly revenue into granular operational intervals:
              </p>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-blue-300 mb-3">
                Year ➔ Month ➔ Week ➔ Hour (0-23)
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              `GROUP BY date, hour`
            </p>
          </div>

          {/* Slice */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 hover:border-purple-500/50 transition-all flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">Hyperplane Cut</span>
              <h4 className="text-sm font-bold text-white mb-2">3. Slice (1D Filter)</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Extracts a 2-dimensional sub-cube by fixing a single dimension value:
              </p>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-purple-300 mb-3">
                WHERE f.city = 'Mumbai'
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              Isolates the Mumbai suburban division
            </p>
          </div>

          {/* Dice */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 hover:border-amber-500/50 transition-all flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">Sub-Cube Extraction</span>
              <h4 className="text-sm font-bold text-white mb-2">4. Dice (Multi-D Selection)</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Extracts a focused sub-cube by constraining multiple criteria simultaneously:
              </p>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-amber-300 mb-3">
                WHERE Line='Western' AND Hour BETWEEN 8 AND 11
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              Western Morning Peak Rush Sub-cube
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
