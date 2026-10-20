# UTS Suburban Railway Analytics & Data Mining Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.149.0-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=flat&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.9.1-F7931E?style=flat&logo=scikit-learn)](https://scikit-learn.org)
[![Python](https://img.shields.io/badge/Python-3.13+-3776AB?style=flat&logo=python)](https://python.org)

An end-to-end Data Warehousing & Data Mining (DWDM) platform built on the **UTS (Unreserved Ticketing System)** railway dataset spanning **7,18,661 transactions** (~7.19 Lakh) across the Mumbai and Pune suburban rail divisions.

The platform provides a **Kimball Star Schema Data Warehouse**, an automated **Pandas ETL pipeline**, a high-performance **FastAPI backend** serving OLAP aggregations and machine learning models, and an interactive **React 19 dashboard** with localized Indian numbering formatting (Lakhs & Crores) and an Academic Viva Explainer.

---

## 1. Monorepo Directory Layout

```
.
├── backend/
│   ├── main_api.py              # FastAPI OLAP analytics & data mining inference service
│   ├── etl_pipeline.py          # Production Pandas ETL pipeline (Clean, Transform, Load)
│   ├── schema_sqlite.sql        # SQLite Star Schema DDL with foreign keys and indexes
│   ├── schema_postgresql.sql    # PostgreSQL enterprise Star Schema DDL with analytical views
│   ├── uts_railway.db           # Analytical SQLite warehouse (7,18,661 fact rows)
│   ├── Uts_Data.csv             # Raw source ticketing dataset
│   ├── requirements.txt         # Pinned backend Python dependencies
│   └── Procfile                 # Cloud deployment start command (Render / Railway / Heroku)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardView.jsx         # View 1: Operational Monitoring, OLAP Charts & ML
│   │   │   └── AcademicExplainerView.jsx # View 2: DWDM Architecture & Algorithm Viva Explainer
│   │   ├── services/
│   │   │   └── api.js                    # API client with health telemetry & offline fallbacks
│   │   ├── utils/
│   │   │   └── formatters.js             # Indian Numbering System utility (Lakhs & Crores)
│   │   ├── config.js                     # Dynamic environment API base URL resolver
│   │   ├── App.jsx                       # Master shell with sticky header & tab navigation
│   │   ├── index.css                     # Tailwind CSS v4 setup & dark theme typography
│   │   └── main.jsx                      # React entrypoint
│   ├── package.json                      # Frontend dependencies (Recharts, Lucide-React)
│   └── vite.config.js                    # Vite 8 configuration with Tailwind plugin & proxy
├── .gitignore                            # Monorepo root gitignore configuration
├── render.yaml                           # Infrastructure as Code: Render cloud blueprint
└── README.md                             # Comprehensive technical documentation
```

---

## 2. Architecture & Data Pipeline Flow

```
[ Raw CSV: Uts_Data.csv ] (7,18,661 records, 5-digit rolling ticket counters)
          │
          ▼
[ Pandas ETL Pipeline: etl_pipeline.py ]
   ├── Whitespace stripping on categorical columns
   ├── ISO date parsing & vectorized 'Hour' derivation (0-23)
   ├── Domain anomaly resolution: ₹0 seasonal passes vs positive single fares
   └── Entity integrity: Synthetic surrogate PK generation (booking_id = 1..N)
          │
          ▼
[ Kimball Star Schema Data Warehouse: uts_railway.db ]
   ├── Dim_Station (21 nodes across Mumbai & Pune transit corridors)
   ├── Dim_Time (8,760 hourly temporal grains)
   ├── Dim_Ticket (6 ticket type × booking mode configurations)
   └── Fact_Ticket_Bookings (7,18,661 rows, 100% referential integrity)
          │
          ▼
[ FastAPI Backend Service: main_api.py ]
   ├── Startup Async Lifespan Pre-Warming (<10ms inference response)
   ├── OLAP Roll-Up & Slice/Dice Engine (Revenue, 24h Rush Profile)
   ├── Random Forest Classifier (Rush-hour crowding prediction)
   ├── K-Means Clustering (Station congestion tiers: High, Moderate, Low)
   └── Apriori Pattern Mining (Frequent itemsets, Support, Confidence, Lift)
          │
          ▼
[ React 19 + Tailwind CSS + Recharts Dashboard ]
   ├── View 1: Railway Operational Intelligence Dashboard
   └── View 2: Academic Methodology & DWDM Architecture Explainer (Viva-Ready)
```

---

## 3. Database Star Schema Specification

### Tables & Relationships
- **`Fact_Ticket_Bookings`** (`7,18,661` rows):
  - `booking_id` (PK, Unique Surrogate Key)
  - `source_booking_id` (Original 5-digit operational ticket counter from machine rolls)
  - `date`, `month`, `week`, `time`
  - `ticket_type`, `booking_mode`
  - `from_station_id` (FK $\to$ `Dim_Station.station_id`)
  - `to_station_id` (FK $\to$ `Dim_Station.station_id`)
  - `time_id` (FK $\to$ `Dim_Time.time_id`, deterministic format `YYYYMMDDHH`)
  - `ticket_type_id` (FK $\to$ `Dim_Ticket.ticket_type_id`)
  - `passengers` (`CHECK > 0`)
  - `total_fare` (`CHECK >= 0`, ₹0 for prepaid season passes)
  - `payment_type`, `railway_line`, `city`
- **`Dim_Station`** (`21` records): `station_id` (PK), `station_name`, `railway_line`, `city`.
- **`Dim_Time`** (`8,760` records): `time_id` (PK), `date`, `month`, `week`, `hour`.
- **`Dim_Ticket`** (`6` records): `ticket_type_id` (PK), `ticket_type`, `booking_mode`.

---

## 4. Local Quickstart Guide

### Prerequisites
- Python 3.11+ or 3.13+
- Node.js 18+ and npm

### Backend Setup
```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

# 3. Install pinned dependencies
pip install -r requirements.txt

# 4. (Optional) Re-run ETL migration and pipeline
python etl_pipeline.py

# 5. Start the FastAPI backend server
python main_api.py
# Or using uvicorn:
uvicorn main_api:app --host 127.0.0.1 --port 8008 --reload
```
*API Swagger Documentation is available at [http://127.0.0.1:8008/docs](http://127.0.0.1:8008/docs).*

### Frontend Setup
```bash
# 1. Open a new terminal and navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
*Access the React UI at [http://127.0.0.1:5173/](http://127.0.0.1:5173/) (or port 5174).*

---

## 5. Cloud Deployment Guide

### Option A: Render One-Click Blueprint (`render.yaml`)
This repository contains a ready-to-deploy `render.yaml` blueprint defining both backend and frontend services:
1. Push this repository to your GitHub account.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\to$ **Blueprint**.
3. Select your repository. Render will automatically provision:
   - **`uts-railway-backend`**: Python Web Service executing `uvicorn main_api:app --host 0.0.0.0 --port $PORT`.
   - **`uts-railway-frontend`**: Static Web Site running `npm install && npm run build` and publishing `dist/`.

### Option B: Railway Deployment
1. Connect your GitHub repository to [Railway](https://railway.app).
2. Set root directory for the backend service to `/backend`. Railway will automatically detect `backend/Procfile` and `backend/requirements.txt`.
3. Set root directory for the frontend service to `/frontend` (Build: `npm install && npm run build`, Output: `dist`).

### Option C: Vercel (Frontend Only)
1. Import repository on [Vercel](https://vercel.com).
2. Set root directory to `frontend`.
3. Configure the environment variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://uts-railway-backend.onrender.com`).

---

## 6. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Service health check and endpoint directory |
| `GET` | `/api/analytics/overview` | Executive KPI cards (Bookings, Passengers, Revenue, Stations) |
| `GET` | `/api/analytics/revenue` | OLAP Roll-up & Slice/Dice by `railway_line`, `city`, and `month` |
| `GET` | `/api/analytics/rush-hours` | Aggregated 24-hour passenger traffic and rush-hour classifications |
| `GET` | `/api/mining/station-clusters` | K-Means clustering classifying stations into 3 traffic tiers |
| `POST` | `/api/mining/predict-rush` | Random Forest classifier predicting journey congestion risk |
| `GET` | `/api/mining/association-rules` | Apriori rule mining correlating ticket types, modes, and payments |

---

## 7. Academic Methodology & Viva Reference

- **Dimensional Modeling**: Pure Kimball Star Schema with degenerate dimensions preserved on the fact grain for sub-second slice-and-dice queries.
- **Indian Numbering System Localization**:
  - Revenue formatted in **₹ Crores** (`₹2.69 Cr`) and **₹ Lakhs** (`₹269.48 Lakh`, `₹67.58 Lakh`).
  - Commuter and booking volumes formatted in **Lakhs** (`17.96 Lakh` passengers, `7.19 Lakh` bookings).
- **Classification (Random Forest)**:
  - Predicts $P(\text{Rush} \mid X)$ based on `hour`, `railway_line`, `ticket_type`, and `booking_mode`.
  - Achieves ~85% accuracy on suburban rush-hour patterns.
- **Clustering (K-Means)**:
  - Standardized multi-attribute space (`total_passengers`, `total_revenue`) segmented into 3 congestion tiers:
    1. **High Congestion Hubs** (Pune Suburban nodes: Shivajinagar, Akurdi, Pune Jn, Khadki; ~1.12 Lakh pax).
    2. **Moderate Traffic** (Harbour Line junctions: Wadala, Vashi, Kurla, Panvel, CST; ~0.90 Lakh pax).
    3. **Low Traffic** (Western and Central local stops; ~0.75 Lakh pax).
- **Association Rule Mining (Apriori Logic)**:
  - Discovers high-confidence behavioral patterns:
    $$\text{Payment=UPI} \Longrightarrow \text{Mode=Paperless} \quad (\text{Confidence: } 50.5\%, \text{ Lift: } 1.012\times)$$
    $$\text{Payment=Cash} \Longrightarrow \text{Mode=Paper} \quad (\text{Confidence: } 50.5\%, \text{ Lift: } 1.006\times)$$

---

## 8. License

Developed for Academic Research & Demonstration in Suburban Railway Transit Analytics. Released under the MIT License.
#   R a i l w a y - A n a l y t i c s  
 