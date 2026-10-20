"""
================================================================================
UTS Railway Analytics: FastAPI OLAP & Data Mining Backend Service
Database Architect, Backend Engineer & Data Scientist Implementation
================================================================================
Exposes high-performance REST APIs for:
1. Multi-Dimensional OLAP Analytics:
   - Overview KPI Cards (/api/analytics/overview)
   - Roll-up & Slice/Dice Revenue & Volume (/api/analytics/revenue)
   - 24-Hour Passenger Traffic & Rush Hour Profiling (/api/analytics/rush-hours)
2. Machine Learning & Data Mining:
   - Station Congestion K-Means Clustering (/api/mining/station-clusters)
   - Predictive Journey Rush Classifier (/api/mining/predict-rush)
   - Frequent Itemsets & Association Rule Mining (/api/mining/association-rules)
================================================================================
"""

import os
import sys
import time
import sqlite3
import logging
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager
from itertools import combinations

import numpy as np
import pandas as pd
from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Scikit-Learn components for Data Mining models
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

# ------------------------------------------------------------------------------
# Logging Configuration
# ------------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("UTS_API_Backend")

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BACKEND_DIR, "uts_railway.db") if os.path.exists(os.path.join(BACKEND_DIR, "uts_railway.db")) else "uts_railway.db"
DB_PATH = os.getenv("DATABASE_PATH", DEFAULT_DB_PATH)


# ------------------------------------------------------------------------------
# In-Memory Machine Learning Model Cache
# ------------------------------------------------------------------------------
class ModelCache:
    """Pre-warmed in-memory cache for ultra-fast model inference & mining results."""
    def __init__(self):
        self.rush_classifier: Optional[Pipeline] = None
        self.station_clusters: Optional[Dict[str, Any]] = None
        self.association_rules: Optional[Dict[str, Any]] = None
        self.is_warmed: bool = False

ml_cache = ModelCache()


def get_db_connection() -> sqlite3.Connection:
    """Creates a optimized read-only or fast connection to the SQLite database."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database file '{DB_PATH}' not found. Please run etl_pipeline.py first."
        )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA query_only = ON;")
    return conn


# ------------------------------------------------------------------------------
# Model Training & Pre-Warming Utilities
# ------------------------------------------------------------------------------
def train_rush_hour_classifier(conn: sqlite3.Connection) -> Pipeline:
    """
    Trains a Random Forest classifier predicting whether a journey profile
    falls into a congested rush-hour window based on time and transit parameters.
    """
    logger.info("Training Predictive Rush Hour Classifier...")
    # Load representative sample of fact records with time dimension
    query = """
    SELECT 
        dt.hour,
        f.railway_line,
        f.ticket_type,
        f.booking_mode,
        f.passengers
    FROM Fact_Ticket_Bookings f
    JOIN Dim_Time dt ON f.time_id = dt.time_id
    LIMIT 100000;
    """
    df = pd.read_sql_query(query, conn)

    # Standard Suburban Transit Congestion Definition:
    # Morning Rush: 8-11 AM, Evening Rush: 5-8 PM (17-20)
    df["is_rush_hour"] = df["hour"].apply(lambda h: 1 if (8 <= h <= 11) or (17 <= h <= 20) else 0)

    features = ["hour", "railway_line", "ticket_type", "booking_mode"]
    X = df[features]
    y = df["is_rush_hour"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", ["hour"]),
            ("cat", OneHotEncoder(handle_unknown="ignore"), ["railway_line", "ticket_type", "booking_mode"])
        ]
    )

    clf_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(n_estimators=40, max_depth=6, random_state=42, n_jobs=-1))
    ])

    clf_pipeline.fit(X, y)
    logger.info("Rush Hour Classifier trained successfully (training accuracy: %.2f%%).", clf_pipeline.score(X, y) * 100)
    return clf_pipeline


def compute_station_clusters(conn: sqlite3.Connection, n_clusters: int = 3) -> Dict[str, Any]:
    """
    Applies K-Means clustering to railway stations based on departure volume
    and ticket revenue to categorize stations into congestion tiers.
    """
    logger.info("Computing K-Means station clusters...")
    query = """
    SELECT 
        s.station_id,
        s.station_name,
        s.railway_line,
        s.city,
        COUNT(f.booking_id) AS total_departures,
        SUM(f.passengers) AS total_passengers,
        SUM(f.total_fare) AS total_revenue
    FROM Dim_Station s
    JOIN Fact_Ticket_Bookings f ON s.station_id = f.from_station_id
    GROUP BY s.station_id, s.station_name, s.railway_line, s.city;
    """
    df_station = pd.read_sql_query(query, conn)

    X = df_station[["total_passengers", "total_revenue"]]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df_station["cluster_id"] = kmeans.fit_predict(X_scaled)

    # Order clusters by mean passenger volume to label tiers deterministically
    cluster_means = df_station.groupby("cluster_id")["total_passengers"].mean().sort_values()
    tier_labels = ["Low Traffic", "Moderate Traffic", "High Congestion Hub"]
    tier_mapping = {cluster_id: label for cluster_id, label in zip(cluster_means.index, tier_labels)}
    df_station["tier_label"] = df_station["cluster_id"].map(tier_mapping)

    # Cluster Summary
    clusters_summary = []
    for cid in range(n_clusters):
        subset = df_station[df_station["cluster_id"] == cid]
        clusters_summary.append({
            "cluster_id": int(cid),
            "tier_label": tier_mapping[cid],
            "station_count": int(len(subset)),
            "avg_passengers": round(float(subset["total_passengers"].mean()), 2),
            "avg_revenue": round(float(subset["total_revenue"].mean()), 2),
            "stations_included": subset["station_name"].tolist()
        })

    stations_list = df_station.sort_values(by="total_passengers", ascending=False).to_dict(orient="records")

    return {
        "n_clusters": n_clusters,
        "clusters_summary": clusters_summary,
        "stations": stations_list
    }


def mine_association_rules(conn: sqlite3.Connection, min_support: float = 0.05, min_confidence: float = 0.30) -> Dict[str, Any]:
    """
    Mines frequent itemsets and computes association rules on suburban ticket booking
    attributes: ticket_type, booking_mode, payment_type, and railway_line.
    """
    logger.info("Mining association rules from booking transactions...")
    query = """
    SELECT ticket_type, booking_mode, payment_type, railway_line
    FROM Fact_Ticket_Bookings
    LIMIT 200000;
    """
    df = pd.read_sql_query(query, conn)
    total_tx = len(df)

    items_df = pd.DataFrame({
        "Ticket": "Ticket=" + df["ticket_type"],
        "Mode": "Mode=" + df["booking_mode"],
        "Payment": "Payment=" + df["payment_type"],
        "Line": "Line=" + df["railway_line"]
    })
    transactions = [set(row) for row in items_df.values]

    # 1-item frequencies
    item_counts: Dict[str, int] = {}
    for tx in transactions:
        for item in tx:
            item_counts[item] = item_counts.get(item, 0) + 1

    # 2-item frequencies
    pair_counts: Dict[tuple, int] = {}
    for tx in transactions:
        for a, b in combinations(sorted(tx), 2):
            pair_counts[(a, b)] = pair_counts.get((a, b), 0) + 1

    frequent_itemsets = []
    for item, cnt in item_counts.items():
        supp = cnt / total_tx
        if supp >= min_support:
            frequent_itemsets.append({"itemset": [item], "support": round(supp, 4)})

    rules = []
    for (a, b), count_ab in pair_counts.items():
        supp_ab = count_ab / total_tx
        if supp_ab < min_support:
            continue

        # Rule 1: A -> B
        conf_a_b = count_ab / item_counts[a]
        lift_a_b = conf_a_b / (item_counts[b] / total_tx)
        if conf_a_b >= min_confidence:
            rules.append({
                "antecedent": a,
                "consequent": b,
                "support": round(supp_ab, 4),
                "confidence": round(conf_a_b, 4),
                "lift": round(lift_a_b, 4),
                "insight": f"When '{a}' occurs, '{b}' is observed {round(conf_a_b * 100, 1)}% of the time (Lift: {round(lift_a_b, 3)}x)."
            })

        # Rule 2: B -> A
        conf_b_a = count_ab / item_counts[b]
        lift_b_a = conf_b_a / (item_counts[a] / total_tx)
        if conf_b_a >= min_confidence:
            rules.append({
                "antecedent": b,
                "consequent": a,
                "support": round(supp_ab, 4),
                "confidence": round(conf_b_a, 4),
                "lift": round(lift_b_a, 4),
                "insight": f"When '{b}' occurs, '{a}' is observed {round(conf_b_a * 100, 1)}% of the time (Lift: {round(lift_b_a, 3)}x)."
            })

    rules_sorted = sorted(rules, key=lambda r: r["confidence"], reverse=True)

    return {
        "total_transactions_analyzed": total_tx,
        "min_support_threshold": min_support,
        "min_confidence_threshold": min_confidence,
        "total_rules_discovered": len(rules_sorted),
        "frequent_single_itemsets": sorted(frequent_itemsets, key=lambda x: x["support"], reverse=True),
        "association_rules": rules_sorted[:25]
    }


# ------------------------------------------------------------------------------
# FastAPI Lifespan Handler: Model Warm-up
# ------------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes and pre-warms database connection and ML models on startup."""
    logger.info("Initializing UTS Railway Analytics FastAPI Service...")
    if os.path.exists(DB_PATH):
        try:
            conn = get_db_connection()
            ml_cache.rush_classifier = train_rush_hour_classifier(conn)
            ml_cache.station_clusters = compute_station_clusters(conn, n_clusters=3)
            ml_cache.association_rules = mine_association_rules(conn)
            ml_cache.is_warmed = True
            conn.close()
            logger.info("All Machine Learning & Mining models pre-warmed successfully.")
        except Exception as e:
            logger.error("Error during ML model pre-warming: %s", str(e), exc_info=True)
    else:
        logger.warning("Database '%s' not found. Analytics will fail until database is created.", DB_PATH)

    yield
    logger.info("Shutting down UTS Railway Analytics FastAPI Service.")


# ------------------------------------------------------------------------------
# FastAPI Application Initialization & CORS
# ------------------------------------------------------------------------------
app = FastAPI(
    title="UTS Suburban Railway Analytics & Data Mining API",
    description=(
        "Production-grade backend service providing multi-dimensional OLAP analytics, "
        "roll-up / slice-and-dice queries, and predictive data mining models "
        "(K-Means clustering, Random Forest rush hour prediction, and Association Rule Mining) "
        "powered by the UTS suburban ticketing warehouse."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Pydantic Response Schemas
# ------------------------------------------------------------------------------
class OverviewMetrics(BaseModel):
    total_bookings: int
    total_passengers: int
    total_revenue: float
    total_stations: int
    total_railway_lines: int
    total_cities: int
    avg_fare_per_booking: float
    avg_passengers_per_booking: float
    popular_payment_mode: str
    popular_ticket_type: str
    paperless_adoption_rate: str
    busiest_origin_station: str


class RevenueRecord(BaseModel):
    railway_line: Optional[str] = None
    city: Optional[str] = None
    month: Optional[str] = None
    total_bookings: int
    total_passengers: int
    total_revenue: float
    avg_fare_per_booking: float
    revenue_share_percentage: float


class RevenueAnalyticsResponse(BaseModel):
    filters_applied: Dict[str, Any]
    grouped_by: List[str]
    total_revenue_overall: float
    total_bookings_overall: int
    data: List[Dict[str, Any]]


class HourlyRushHour(BaseModel):
    hour: int
    time_window: str
    total_bookings: int
    total_passengers: int
    total_revenue: float
    is_rush_hour: bool
    rush_level: str


class RushHoursResponse(BaseModel):
    city_filter: Optional[str]
    line_filter: Optional[str]
    peak_hour: int
    peak_passenger_volume: int
    lowest_hour: int
    hourly_distribution: List[HourlyRushHour]


class RushPredictionRequest(BaseModel):
    hour: int = Field(..., ge=0, le=23, description="Travel hour in 24-hr format (0-23)")
    railway_line: str = Field("Western", description="Operating line: Western, Central, Harbour, Pune")
    ticket_type: str = Field("Single", description="Ticket category: Single, Return, Monthly Pass")
    booking_mode: str = Field("Paperless", description="Booking medium: Paper, Paperless")


class RushPredictionResponse(BaseModel):
    input_parameters: Dict[str, Any]
    is_rush_hour: bool
    rush_probability: float
    risk_level: str
    congestion_advisory: str


# ------------------------------------------------------------------------------
# Root Endpoint
# ------------------------------------------------------------------------------
@app.get("/", tags=["System"])
def root():
    """Health check and API catalog."""
    return {
        "service": "UTS Suburban Railway Analytics & Data Mining Service",
        "status": "ONLINE",
        "database": DB_PATH,
        "models_warmed": ml_cache.is_warmed,
        "endpoints": {
            "swagger_docs": "/docs",
            "redoc": "/redoc",
            "analytics_overview": "/api/analytics/overview",
            "analytics_revenue": "/api/analytics/revenue",
            "analytics_rush_hours": "/api/analytics/rush-hours",
            "mining_station_clusters": "/api/mining/station-clusters",
            "mining_predict_rush": "/api/mining/predict-rush",
            "mining_association_rules": "/api/mining/association-rules"
        }
    }


# ==============================================================================
# 1. OLAP Analytics Endpoints
# ==============================================================================

@app.get(
    "/api/analytics/overview",
    response_model=OverviewMetrics,
    tags=["OLAP Analytics"],
    summary="Get High-Level Summary KPI Cards"
)
def get_overview_kpis():
    """
    Returns enterprise high-level summary cards for executive dashboards:
    - Total Bookings, Passengers, Revenue
    - Active Stations, Lines, and Cities
    - Average Fares and Load Factors
    - Paperless Fulfillment Ratio and Peak Stations
    """
    conn = get_db_connection()
    try:
        # Aggregated Metrics from Fact Table
        fact_query = """
        SELECT
            COUNT(booking_id) AS total_bookings,
            SUM(passengers) AS total_passengers,
            SUM(total_fare) AS total_revenue,
            ROUND(AVG(total_fare), 2) AS avg_fare,
            ROUND(AVG(passengers), 2) AS avg_passengers,
            COUNT(DISTINCT railway_line) AS total_lines,
            COUNT(DISTINCT city) AS total_cities
        FROM Fact_Ticket_Bookings;
        """
        fact_stats = conn.execute(fact_query).fetchone()

        # Station count
        station_count = conn.execute("SELECT COUNT(*) AS cnt FROM Dim_Station;").fetchone()["cnt"]

        # Top Origin Station
        top_station_row = conn.execute("""
            SELECT s.station_name, s.railway_line, SUM(f.passengers) AS passengers
            FROM Fact_Ticket_Bookings f
            JOIN Dim_Station s ON f.from_station_id = s.station_id
            GROUP BY s.station_name, s.railway_line
            ORDER BY passengers DESC
            LIMIT 1;
        """).fetchone()
        busiest_station = f"{top_station_row['station_name']} ({top_station_row['railway_line']})" if top_station_row else "N/A"

        # Popular Payment Mode
        top_pay = conn.execute("""
            SELECT payment_type, COUNT(*) AS cnt
            FROM Fact_Ticket_Bookings
            GROUP BY payment_type
            ORDER BY cnt DESC
            LIMIT 1;
        """).fetchone()

        # Popular Ticket Type
        top_ticket = conn.execute("""
            SELECT ticket_type, COUNT(*) AS cnt
            FROM Fact_Ticket_Bookings
            GROUP BY ticket_type
            ORDER BY cnt DESC
            LIMIT 1;
        """).fetchone()

        # Paperless Adoption Rate
        modes = conn.execute("""
            SELECT booking_mode, COUNT(*) AS cnt
            FROM Fact_Ticket_Bookings
            GROUP BY booking_mode;
        """).fetchall()
        mode_dict = {row["booking_mode"]: row["cnt"] for row in modes}
        total_b = fact_stats["total_bookings"]
        paperless_pct = round((mode_dict.get("Paperless", 0) / max(total_b, 1)) * 100, 2)

        return OverviewMetrics(
            total_bookings=fact_stats["total_bookings"],
            total_passengers=fact_stats["total_passengers"],
            total_revenue=float(fact_stats["total_revenue"]),
            total_stations=station_count,
            total_railway_lines=fact_stats["total_lines"],
            total_cities=fact_stats["total_cities"],
            avg_fare_per_booking=float(fact_stats["avg_fare"]),
            avg_passengers_per_booking=float(fact_stats["avg_passengers"]),
            popular_payment_mode=top_pay["payment_type"] if top_pay else "N/A",
            popular_ticket_type=top_ticket["ticket_type"] if top_ticket else "N/A",
            paperless_adoption_rate=f"{paperless_pct}%",
            busiest_origin_station=busiest_station
        )
    finally:
        conn.close()


@app.get(
    "/api/analytics/revenue",
    response_model=RevenueAnalyticsResponse,
    tags=["OLAP Analytics"],
    summary="Multi-Dimensional Roll-up and Slice/Dice Revenue Analytics"
)
def get_revenue_analytics(
    railway_line: Optional[str] = Query(None, description="Slice by Railway Line: Central, Western, Harbour, Pune"),
    city: Optional[str] = Query(None, description="Slice by City: Mumbai, Pune"),
    month: Optional[str] = Query(None, description="Slice by Month: Jan, Feb, ... Dec"),
    group_by: Optional[str] = Query("railway_line,city", description="Dimensions to group by (comma-separated: railway_line, city, month)")
):
    """
    Provides flexible OLAP slicing, dicing, and roll-up capabilities:
    - Slice by `railway_line`, `city`, or `month`.
    - Roll-up / Group-by custom combinations (e.g., `city`, `railway_line,month`).
    - Calculates total revenue, passenger counts, bookings, and revenue share %.
    """
    conn = get_db_connection()
    try:
        allowed_group_cols = {"railway_line", "city", "month"}
        req_group_cols = [c.strip().lower() for c in group_by.split(",") if c.strip().lower() in allowed_group_cols]
        if not req_group_cols:
            req_group_cols = ["railway_line", "city"]

        # Build dynamic WHERE clause
        filters = []
        params = []
        filters_applied = {}

        if railway_line:
            filters.append("f.railway_line = ?")
            params.append(railway_line.strip())
            filters_applied["railway_line"] = railway_line

        if city:
            filters.append("f.city = ?")
            params.append(city.strip())
            filters_applied["city"] = city

        if month:
            filters.append("f.month = ?")
            params.append(month.strip())
            filters_applied["month"] = month

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        # Total revenue for calculating share
        total_query = f"SELECT SUM(total_fare) AS total_rev, COUNT(booking_id) AS total_b FROM Fact_Ticket_Bookings f {where_clause};"
        tot_row = conn.execute(total_query, params).fetchone()
        overall_rev = float(tot_row["total_rev"] or 0)
        overall_bookings = int(tot_row["total_b"] or 0)

        # Dynamic Group-By Query
        select_cols = ", ".join([f"f.{c}" for c in req_group_cols])
        group_cols = ", ".join([f"f.{c}" for c in req_group_cols])

        olap_query = f"""
        SELECT 
            {select_cols},
            COUNT(f.booking_id) AS total_bookings,
            SUM(f.passengers) AS total_passengers,
            SUM(f.total_fare) AS total_revenue,
            ROUND(AVG(f.total_fare), 2) AS avg_fare_per_booking
        FROM Fact_Ticket_Bookings f
        {where_clause}
        GROUP BY {group_cols}
        ORDER BY total_revenue DESC;
        """
        rows = conn.execute(olap_query, params).fetchall()

        data = []
        for r in rows:
            item = dict(r)
            rev = float(item["total_revenue"])
            item["total_revenue"] = rev
            item["revenue_share_percentage"] = round((rev / max(overall_rev, 1.0)) * 100, 2)
            data.append(item)

        return RevenueAnalyticsResponse(
            filters_applied=filters_applied,
            grouped_by=req_group_cols,
            total_revenue_overall=overall_rev,
            total_bookings_overall=overall_bookings,
            data=data
        )
    finally:
        conn.close()


@app.get(
    "/api/analytics/rush-hours",
    response_model=RushHoursResponse,
    tags=["OLAP Analytics"],
    summary="24-Hour Passenger Traffic & Rush Hour Profiling"
)
def get_rush_hours_analytics(
    city: Optional[str] = Query(None, description="Filter by City: Mumbai, Pune"),
    railway_line: Optional[str] = Query(None, description="Filter by Railway Line: Central, Western, Harbour, Pune")
):
    """
    Aggregates passenger journeys across all 24 hours of the day (0 to 23).
    Identifies peak morning and evening rush hours, passenger counts, and revenue.
    """
    conn = get_db_connection()
    try:
        filters = []
        params = []
        if city:
            filters.append("f.city = ?")
            params.append(city.strip())
        if railway_line:
            filters.append("f.railway_line = ?")
            params.append(railway_line.strip())

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        query = f"""
        SELECT 
            dt.hour,
            COUNT(f.booking_id) AS total_bookings,
            SUM(f.passengers) AS total_passengers,
            SUM(f.total_fare) AS total_revenue
        FROM Fact_Ticket_Bookings f
        JOIN Dim_Time dt ON f.time_id = dt.time_id
        {where_clause}
        GROUP BY dt.hour
        ORDER BY dt.hour ASC;
        """
        rows = conn.execute(query, params).fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No data matching specified filters.")

        hourly_data: List[HourlyRushHour] = []
        max_passengers = 0
        min_passengers = float("inf")
        peak_hour = 0
        lowest_hour = 0

        # Calculate passenger threshold for rush-hour labeling
        passenger_counts = [r["total_passengers"] for r in rows]
        p75 = np.percentile(passenger_counts, 75) if passenger_counts else 0

        for r in rows:
            h = int(r["hour"])
            passengers = int(r["total_passengers"])
            bookings = int(r["total_bookings"])
            rev = float(r["total_revenue"])

            if passengers > max_passengers:
                max_passengers = passengers
                peak_hour = h
            if passengers < min_passengers:
                min_passengers = passengers
                lowest_hour = h

            # Rush Hour Classification logic:
            is_rush = (8 <= h <= 11) or (17 <= h <= 20) or (passengers >= p75)
            if passengers >= p75:
                level = "PEAK"
            elif is_rush:
                level = "HIGH"
            elif passengers >= np.median(passenger_counts):
                level = "MODERATE"
            else:
                level = "LOW"

            time_window = f"{h:02d}:00 - {(h+1)%24:02d}:00"
            hourly_data.append(HourlyRushHour(
                hour=h,
                time_window=time_window,
                total_bookings=bookings,
                total_passengers=passengers,
                total_revenue=rev,
                is_rush_hour=is_rush,
                rush_level=level
            ))

        return RushHoursResponse(
            city_filter=city,
            line_filter=railway_line,
            peak_hour=peak_hour,
            peak_passenger_volume=max_passengers,
            lowest_hour=lowest_hour,
            hourly_distribution=hourly_data
        )
    finally:
        conn.close()


# ==============================================================================
# 2. Data Mining Endpoints
# ==============================================================================

@app.get(
    "/api/mining/station-clusters",
    tags=["Data Mining & ML"],
    summary="K-Means Clustering: Station Congestion Tiers"
)
def get_station_clusters(
    n_clusters: int = Query(3, ge=2, le=5, description="Number of clusters for K-Means (default: 3)"),
    recompute: bool = Query(False, description="Force recompute rather than using cached model")
):
    """
    Applies K-Means Clustering on suburban railway stations based on:
    - Passenger Volume
    - Total Ticket Revenue Generated
    
    Categorizes station nodes into three congestion tiers:
    - **High Congestion Hub**: Major transit interchanges and high-density terminals.
    - **Moderate Traffic**: Secondary junctions and high-frequency stops.
    - **Low Traffic**: Standard suburban local halts.
    """
    if ml_cache.station_clusters and not recompute and n_clusters == 3:
        return ml_cache.station_clusters

    conn = get_db_connection()
    try:
        clusters_result = compute_station_clusters(conn, n_clusters=n_clusters)
        if n_clusters == 3:
            ml_cache.station_clusters = clusters_result
        return clusters_result
    finally:
        conn.close()


@app.get(
    "/api/mining/predict-rush",
    response_model=RushPredictionResponse,
    tags=["Data Mining & ML"],
    summary="Predict Journey Rush Hour Risk (Random Forest Classifier)"
)
def predict_journey_rush(
    hour: int = Query(..., ge=0, le=23, description="Travel hour in 24-hr format (0-23)"),
    railway_line: str = Query("Western", description="Operating line: Western, Central, Harbour, Pune"),
    ticket_type: str = Query("Single", description="Ticket category: Single, Return, Monthly Pass"),
    booking_mode: str = Query("Paperless", description="Booking medium: Paper, Paperless")
):
    """
    Predicts whether a proposed commuter journey will experience **High-Risk Rush Hour** conditions.
    Utilizes a trained Scikit-Learn Random Forest Classifier evaluated across temporal
    patterns, fulfillment modes, and railway corridors.
    """
    if ml_cache.rush_classifier is None:
        conn = get_db_connection()
        try:
            ml_cache.rush_classifier = train_rush_hour_classifier(conn)
        finally:
            conn.close()

    input_df = pd.DataFrame([{
        "hour": hour,
        "railway_line": railway_line.strip().capitalize(),
        "ticket_type": ticket_type.strip(),
        "booking_mode": booking_mode.strip()
    }])

    prediction = int(ml_cache.rush_classifier.predict(input_df)[0])
    probabilities = ml_cache.rush_classifier.predict_proba(input_df)[0]
    rush_prob = float(probabilities[1]) if len(probabilities) > 1 else float(prediction)

    # Risk level categorization
    if rush_prob >= 0.75:
        risk_level = "CRITICAL RUSH"
        advisory = (
            f"Extreme passenger congestion expected at {hour:02d}:00 on the {railway_line} Line. "
            "Severe platform overcrowding anticipated. Boarding delays likely. "
            "Opt for digital UTS paperless QR ticketing to avoid ticket window queues."
        )
    elif rush_prob >= 0.50:
        risk_level = "HIGH RUSH"
        advisory = (
            f"Moderate-to-high commuter rush forecasted for hour {hour:02d}:00. "
            "Expect packed coaches. Allow an additional 10-15 minutes for transfers."
        )
    elif rush_prob >= 0.30:
        risk_level = "MODERATE TRAFFIC"
        advisory = "Regular suburban operating flow. Manageable crowd levels expected at platforms."
    else:
        risk_level = "LOW TRAFFIC (OFF-PEAK)"
        advisory = "Off-peak travel conditions. Seating readily available; minimal platform wait times."

    return RushPredictionResponse(
        input_parameters={
            "hour": hour,
            "railway_line": railway_line,
            "ticket_type": ticket_type,
            "booking_mode": booking_mode
        },
        is_rush_hour=bool(prediction == 1),
        rush_probability=round(rush_prob, 4),
        risk_level=risk_level,
        congestion_advisory=advisory
    )


@app.post(
    "/api/mining/predict-rush",
    response_model=RushPredictionResponse,
    tags=["Data Mining & ML"],
    summary="Predict Journey Rush Hour Risk via JSON Body (Random Forest Classifier)"
)
def predict_journey_rush_post(request: RushPredictionRequest):
    """POST variant for JSON body requests from frontend clients."""
    return predict_journey_rush(
        hour=request.hour,
        railway_line=request.railway_line,
        ticket_type=request.ticket_type,
        booking_mode=request.booking_mode
    )


@app.get(
    "/api/mining/association-rules",
    tags=["Data Mining & ML"],
    summary="Frequent Itemset & Association Rule Mining"
)
def get_association_rules(
    min_support: float = Query(0.05, ge=0.01, le=1.0, description="Minimum support threshold (default: 0.05)"),
    min_confidence: float = Query(0.30, ge=0.01, le=1.0, description="Minimum confidence threshold (default: 0.30)")
):
    r"""
    Discovers commuter purchasing behavior patterns using Apriori / Association Rule Mining:
    - Cross-correlates `ticket_type`, `booking_mode`, `payment_type`, and `railway_line`.
    - Outputs Support $P(A \cap B)$, Confidence $P(B|A)$, and Lift $\frac{P(B|A)}{P(B)}$.
    - Highlights actionable business and marketing insights for railway transit authorities.
    """
    if ml_cache.association_rules and min_support == 0.05 and min_confidence == 0.30:
        return ml_cache.association_rules

    conn = get_db_connection()
    try:
        rules_result = mine_association_rules(conn, min_support=min_support, min_confidence=min_confidence)
        if min_support == 0.05 and min_confidence == 0.30:
            ml_cache.association_rules = rules_result
        return rules_result
    finally:
        conn.close()


# ------------------------------------------------------------------------------
# Direct Execution Server Runner
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8008))
    logger.info(f"Starting UTS Railway Analytics FastAPI server on http://127.0.0.1:{port}")
    uvicorn.run("main_api:app", host="127.0.0.1", port=port, reload=True)
