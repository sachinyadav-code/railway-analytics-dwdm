"""
================================================================================
UTS Railway Analytics: Automated Production ETL Pipeline
Database Architect & Lead Data Engineer Implementation
================================================================================
This script extracts raw suburban railway ticket transaction logs from
`Uts_Data.csv`, cleans and standardizes the data, handles domain anomalies,
derives temporal analytical features (e.g., travel hour, peak period),
populates a Kimball-standard Star Schema (Dimensions + Fact), and loads
the database (SQLite / PostgreSQL) with referential integrity and indexes.
================================================================================
"""

import os
import sys
import time
import logging
import argparse
import sqlite3
from typing import Tuple, Dict, Any, Optional

import pandas as pd
from sqlalchemy import create_engine, text

# ------------------------------------------------------------------------------
# Logging Configuration
# ------------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("UTS_ETL_Pipeline")


class UTSRailwayETL:
    """
    Production-grade ETL pipeline for UTS Suburban Railway Ticket Data.
    Processes raw ticketing logs into a Star Schema data warehouse.
    """

    def __init__(
        self,
        csv_path: str = "Uts_Data.csv",
        db_type: str = "sqlite",
        db_path: str = "uts_railway.db",
        db_url: Optional[str] = None,
        chunksize: int = 50000,
        recreate_schema: bool = True
    ):
        self.csv_path = csv_path
        self.db_type = db_type.lower()
        self.db_path = db_path
        self.db_url = db_url
        self.chunksize = chunksize
        self.recreate_schema = recreate_schema

        self.engine = None
        self._init_database_connection()

    def _init_database_connection(self):
        """Initializes SQLAlchemy Engine for SQLite or PostgreSQL."""
        if self.db_type == "sqlite":
            sqlite_uri = f"sqlite:///{os.path.abspath(self.db_path)}"
            logger.info("Initializing SQLite Engine at: %s", sqlite_uri)
            self.engine = create_engine(sqlite_uri, echo=False)
        elif self.db_type == "postgres":
            if not self.db_url:
                raise ValueError("PostgreSQL selected but no db_url provided.")
            logger.info("Initializing PostgreSQL Engine at: %s", self.db_url.split("@")[-1])
            self.engine = create_engine(self.db_url, echo=False)
        else:
            raise ValueError(f"Unsupported database type: {self.db_type}. Use 'sqlite' or 'postgres'.")

    def execute_schema_migration(self):
        """Executes the DDL migration scripts to set up the Star Schema."""
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        schema_filename = "schema_sqlite.sql" if self.db_type == "sqlite" else "schema_postgresql.sql"
        schema_file = os.path.join(backend_dir, schema_filename) if os.path.exists(os.path.join(backend_dir, schema_filename)) else schema_filename

        if not os.path.exists(schema_file):
            raise FileNotFoundError(f"Schema migration script not found: {schema_file}")

        with open(schema_file, "r", encoding="utf-8") as f:
            ddl_content = f.read()

        if self.db_type == "sqlite":
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                if self.recreate_schema:
                    logger.info("Dropping existing tables for clean schema recreation...")
                    cursor.execute("DROP TABLE IF EXISTS Fact_Ticket_Bookings;")
                    cursor.execute("DROP TABLE IF EXISTS Dim_Ticket;")
                    cursor.execute("DROP TABLE IF EXISTS Dim_Time;")
                    cursor.execute("DROP TABLE IF EXISTS Dim_Station;")
                cursor.executescript(ddl_content)
                conn.commit()
        else:
            with self.engine.begin() as conn:
                if self.recreate_schema:
                    logger.info("Dropping existing PostgreSQL tables for clean schema recreation...")
                    conn.execute(text("DROP TABLE IF EXISTS Fact_Ticket_Bookings CASCADE;"))
                    conn.execute(text("DROP TABLE IF EXISTS Dim_Ticket CASCADE;"))
                    conn.execute(text("DROP TABLE IF EXISTS Dim_Time CASCADE;"))
                    conn.execute(text("DROP TABLE IF EXISTS Dim_Station CASCADE;"))
                for statement in ddl_content.split(";"):
                    stmt = statement.strip()
                    if stmt:
                        conn.execute(text(stmt))

        logger.info("Star Schema migration applied successfully.")

    # --------------------------------------------------------------------------
    # Step 1: Extraction
    # --------------------------------------------------------------------------
    def extract(self) -> pd.DataFrame:
        """Extracts raw dataset from CSV with profiling."""
        logger.info("Extracting data from: %s", self.csv_path)
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"Dataset not found at: {self.csv_path}")

        t0 = time.time()
        df = pd.read_csv(self.csv_path)
        duration = time.time() - t0
        logger.info("Extracted %d rows and %d columns in %.2f seconds.", len(df), len(df.columns), duration)
        return df

    # --------------------------------------------------------------------------
    # Step 2: Transformation & Cleaning
    # --------------------------------------------------------------------------
    def transform(self, df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Executes robust cleaning, anomaly resolution, feature engineering,
        and Star Schema dimension/fact table construction.
        """
        logger.info("Starting Transformation & Cleaning pipeline...")
        df = df_raw.copy()

        # 1. Check and log null values
        null_counts = df.isnull().sum()
        total_nulls = null_counts.sum()
        if total_nulls > 0:
            logger.warning("Null values detected across columns:\n%s", null_counts[null_counts > 0])
            # Drop records with missing critical identifiers
            critical_cols = ["Date", "Time", "From_Station", "To_Station", "Railway_Line", "City"]
            df.dropna(subset=critical_cols, inplace=True)
            logger.info("Dropped unrecoverable rows. Remaining rows: %d", len(df))
        else:
            logger.info("Data quality check: Zero nulls found across all fields.")

        # 2. Whitespace Stripping from Categorical Strings
        categorical_cols = [
            "From_Station", "To_Station", "Railway_Line", "City",
            "Ticket_Type", "Booking_Mode", "Payment_Type", "Month"
        ]
        for col in categorical_cols:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()
        logger.info("Whitespace stripped from categorical columns: %s", categorical_cols)

        # 3. Data Type Casting & Parsing
        # Parse Date (dataset format is %m/%d/%Y)
        df["Date_Parsed"] = pd.to_datetime(df["Date"], format="%m/%d/%Y", errors="coerce")
        invalid_dates = df["Date_Parsed"].isna().sum()
        if invalid_dates > 0:
            logger.warning("Coerced %d invalid dates. Dropping corrupted date rows.", invalid_dates)
            df.dropna(subset=["Date_Parsed"], inplace=True)

        df["Date_Formatted"] = df["Date_Parsed"].dt.strftime("%Y-%m-%d")

        # Parse Time and Derive 'Hour'
        time_parsed = pd.to_datetime(df["Time"], format="%H:%M:%S", errors="coerce")
        df["Hour"] = time_parsed.dt.hour.astype(int)
        df["Time_Formatted"] = time_parsed.dt.strftime("%H:%M:%S")
        logger.info("Derived feature 'Hour' extracted successfully (Min: %d, Max: %d).", df["Hour"].min(), df["Hour"].max())

        # Numeric casting & range validation
        df["Passengers"] = pd.to_numeric(df["Passengers"], errors="coerce").fillna(1).astype(int)
        df["Total_Fare"] = pd.to_numeric(df["Total_Fare"], errors="coerce").fillna(0).astype(int)

        # Enforce passenger constraint (Passengers >= 1)
        invalid_passengers = (df["Passengers"] < 1).sum()
        if invalid_passengers > 0:
            logger.warning("Found %d rows with passengers < 1; imputing with 1.", invalid_passengers)
            df.loc[df["Passengers"] < 1, "Passengers"] = 1

        # 4. Handle Domain Anomalies (Monthly Pass ₹0 fare vs Single/Return tickets)
        monthly_pass_mask = df["Ticket_Type"] == "Monthly Pass"
        single_return_mask = df["Ticket_Type"].isin(["Single", "Return"])

        # Check: Monthly passes legitimately have Rs. 0 fare in trip logs (prepaid season ticket)
        zero_fare_monthly = (monthly_pass_mask & (df["Total_Fare"] == 0)).sum()
        logger.info("Domain Rule Verified: %d Monthly Pass records correctly exhibit Rs. 0 incremental fare.", zero_fare_monthly)

        # Check: Single/Return tickets with zero or negative fare are anomalies
        anomalous_fare_mask = single_return_mask & (df["Total_Fare"] <= 0)
        anomaly_count = anomalous_fare_mask.sum()
        if anomaly_count > 0:
            logger.warning("Anomaly Detected: %d Single/Return tickets have Total_Fare <= 0. Imputing based on base rate.", anomaly_count)
            # Impute single tickets with standard suburban fare: Rs 15 per passenger
            df.loc[anomalous_fare_mask & (df["Ticket_Type"] == "Single"), "Total_Fare"] = df["Passengers"] * 15
            df.loc[anomalous_fare_mask & (df["Ticket_Type"] == "Return"), "Total_Fare"] = df["Passengers"] * 30
        else:
            logger.info("Fare Integrity Verified: All %d Single/Return tickets have positive fares.", single_return_mask.sum())

        # 5. Handle Booking_ID Non-Uniqueness
        # In the operational ticketing dataset, Booking_ID is a 5-digit rolling counter (10001-99999).
        # To maintain Kimball entity integrity in the Fact Table, we assign a unique surrogate fact key
        # while preserving the original sequence number in source_booking_id.
        df["source_booking_id"] = df["Booking_ID"]
        df["booking_id"] = range(1, len(df) + 1)
        logger.info("Generated %d unique surrogate fact primary keys (booking_id).", len(df))

        # ----------------------------------------------------------------------
        # Construct Dimension Tables
        # ----------------------------------------------------------------------
        logger.info("Constructing Dimension Tables...")

        # A. Dim_Station: Unique combinations of (station_name, railway_line, city)
        stations_from = df[["From_Station", "Railway_Line", "City"]].rename(
            columns={"From_Station": "station_name", "Railway_Line": "railway_line", "City": "city"}
        )
        stations_to = df[["To_Station", "Railway_Line", "City"]].rename(
            columns={"To_Station": "station_name", "Railway_Line": "railway_line", "City": "city"}
        )
        dim_station = pd.concat([stations_from, stations_to]).drop_duplicates().sort_values(
            by=["city", "railway_line", "station_name"]
        ).reset_index(drop=True)
        dim_station["station_id"] = dim_station.index + 1
        dim_station = dim_station[["station_id", "station_name", "railway_line", "city"]]
        logger.info("Constructed Dim_Station: %d distinct station nodes across railway lines.", len(dim_station))

        # B. Dim_Time: Distinct date, month, week, hour
        dim_time = df[["Date_Formatted", "Month", "Week", "Hour", "Date_Parsed"]].drop_duplicates().copy()
        dim_time.rename(columns={"Date_Formatted": "date", "Month": "month", "Week": "week", "Hour": "hour"}, inplace=True)
        # Deterministic Kimball smart integer key: YYYYMMDDHH
        dim_time["time_id"] = (
            dim_time["Date_Parsed"].dt.year * 1000000 +
            dim_time["Date_Parsed"].dt.month * 10000 +
            dim_time["Date_Parsed"].dt.day * 100 +
            dim_time["hour"]
        )
        dim_time = dim_time.sort_values(by="time_id").reset_index(drop=True)
        dim_time = dim_time[["time_id", "date", "month", "week", "hour"]]
        logger.info("Constructed Dim_Time: %d distinct temporal grain points (hourly).", len(dim_time))

        # C. Dim_Ticket: Distinct ticket_type, booking_mode
        dim_ticket = df[["Ticket_Type", "Booking_Mode"]].drop_duplicates().sort_values(
            by=["Ticket_Type", "Booking_Mode"]
        ).reset_index(drop=True)
        dim_ticket["ticket_type_id"] = dim_ticket.index + 1
        dim_ticket.rename(columns={"Ticket_Type": "ticket_type", "Booking_Mode": "booking_mode"}, inplace=True)
        dim_ticket = dim_ticket[["ticket_type_id", "ticket_type", "booking_mode"]]
        logger.info("Constructed Dim_Ticket: %d distinct ticket configurations.", len(dim_ticket))

        # ----------------------------------------------------------------------
        # Construct Fact Table & Map Foreign Keys
        # ----------------------------------------------------------------------
        logger.info("Mapping Foreign Keys into Fact_Ticket_Bookings...")

        # 1. Map from_station_id
        station_lookup = dim_station.set_index(["station_name", "railway_line", "city"])["station_id"].to_dict()
        df["from_station_id"] = df.set_index(["From_Station", "Railway_Line", "City"]).index.map(station_lookup)

        # 2. Map to_station_id
        df["to_station_id"] = df.set_index(["To_Station", "Railway_Line", "City"]).index.map(station_lookup)

        # 3. Map ticket_type_id
        ticket_lookup = dim_ticket.set_index(["ticket_type", "booking_mode"])["ticket_type_id"].to_dict()
        df["ticket_type_id"] = df.set_index(["Ticket_Type", "Booking_Mode"]).index.map(ticket_lookup)

        # 4. Map time_id vectorially (YYYYMMDDHH)
        df["time_id"] = (
            df["Date_Parsed"].dt.year * 1000000 +
            df["Date_Parsed"].dt.month * 10000 +
            df["Date_Parsed"].dt.day * 100 +
            df["Hour"]
        )

        # Select & order exact fact table columns
        fact_ticket_bookings = pd.DataFrame({
            "booking_id": df["booking_id"],
            "source_booking_id": df["source_booking_id"],
            "date": df["Date_Formatted"],
            "month": df["Month"],
            "week": df["Week"],
            "time": df["Time_Formatted"],
            "ticket_type": df["Ticket_Type"],
            "booking_mode": df["Booking_Mode"],
            "from_station_id": df["from_station_id"].astype(int),
            "to_station_id": df["to_station_id"].astype(int),
            "time_id": df["time_id"].astype(int),
            "ticket_type_id": df["ticket_type_id"].astype(int),
            "passengers": df["Passengers"],
            "total_fare": df["Total_Fare"],
            "payment_type": df["Payment_Type"],
            "railway_line": df["Railway_Line"],
            "city": df["City"]
        })

        # Verify referential integrity before load
        assert fact_ticket_bookings["from_station_id"].isna().sum() == 0, "Unmapped from_station_id found!"
        assert fact_ticket_bookings["to_station_id"].isna().sum() == 0, "Unmapped to_station_id found!"
        assert fact_ticket_bookings["time_id"].isna().sum() == 0, "Unmapped time_id found!"
        assert fact_ticket_bookings["ticket_type_id"].isna().sum() == 0, "Unmapped ticket_type_id found!"
        logger.info("Referential integrity check passed: 100%% of foreign keys mapped.")

        return dim_station, dim_time, dim_ticket, fact_ticket_bookings

    # --------------------------------------------------------------------------
    # Step 3: Database Loading
    # --------------------------------------------------------------------------
    def load(
        self,
        dim_station: pd.DataFrame,
        dim_time: pd.DataFrame,
        dim_ticket: pd.DataFrame,
        fact_ticket_bookings: pd.DataFrame
    ):
        """Loads dimensions and fact table into database with high throughput."""
        logger.info("Loading cleaned Star Schema data into %s...", self.db_type.upper())
        t_start = time.time()

        if self.db_type == "sqlite":
            with sqlite3.connect(self.db_path) as conn:
                # Optimize SQLite for high-throughput batch loading
                conn.execute("PRAGMA synchronous = OFF;")
                conn.execute("PRAGMA journal_mode = WAL;")
                conn.execute("PRAGMA cache_size = 100000;")

                # Load Dimensions
                logger.info("Loading Dim_Station (%d records)...", len(dim_station))
                dim_station.to_sql("Dim_Station", conn, if_exists="append", index=False)

                logger.info("Loading Dim_Time (%d records)...", len(dim_time))
                dim_time.to_sql("Dim_Time", conn, if_exists="append", index=False)

                logger.info("Loading Dim_Ticket (%d records)...", len(dim_ticket))
                dim_ticket.to_sql("Dim_Ticket", conn, if_exists="append", index=False)

                # Load Fact Table in Chunks
                total_rows = len(fact_ticket_bookings)
                logger.info("Loading Fact_Ticket_Bookings (%d records in chunks of %d)...", total_rows, self.chunksize)
                for start_idx in range(0, total_rows, self.chunksize):
                    chunk = fact_ticket_bookings.iloc[start_idx : start_idx + self.chunksize]
                    chunk.to_sql("Fact_Ticket_Bookings", conn, if_exists="append", index=False)
                    logger.info("Loaded rows %d to %d (%.1f%% complete)",
                                start_idx + 1, min(start_idx + self.chunksize, total_rows),
                                (min(start_idx + self.chunksize, total_rows) / total_rows) * 100)

                conn.commit()

        else:
            # PostgreSQL loading via SQLAlchemy
            with self.engine.begin() as conn:
                logger.info("Loading Dim_Station into PostgreSQL...")
                dim_station.to_sql("Dim_Station", conn, if_exists="append", index=False)

                logger.info("Loading Dim_Time into PostgreSQL...")
                dim_time.to_sql("Dim_Time", conn, if_exists="append", index=False)

                logger.info("Loading Dim_Ticket into PostgreSQL...")
                dim_ticket.to_sql("Dim_Ticket", conn, if_exists="append", index=False)

                total_rows = len(fact_ticket_bookings)
                logger.info("Loading Fact_Ticket_Bookings into PostgreSQL (%d rows)...", total_rows)
                fact_ticket_bookings.to_sql(
                    "Fact_Ticket_Bookings",
                    conn,
                    if_exists="append",
                    index=False,
                    chunksize=self.chunksize,
                    method="multi"
                )

        duration = time.time() - t_start
        logger.info("Database loading completed successfully in %.2f seconds (%.0f rows/sec).",
                    duration, len(fact_ticket_bookings) / max(duration, 0.001))

    # --------------------------------------------------------------------------
    # Step 4: Post-Load Validation & Analytics
    # --------------------------------------------------------------------------
    def validate_and_report(self):
        """Runs automated data quality checks and key analytical queries."""
        logger.info("Running post-load validation and analytical verification queries...")

        def run_query(query: str) -> pd.DataFrame:
            if self.db_type == "sqlite":
                with sqlite3.connect(self.db_path) as conn:
                    return pd.read_sql_query(query, conn)
            else:
                with self.engine.connect() as conn:
                    return pd.read_sql_query(text(query), conn)

        # 1. Table Record Counts
        tables = ["Dim_Station", "Dim_Time", "Dim_Ticket", "Fact_Ticket_Bookings"]
        counts = {}
        for tbl in tables:
            res = run_query(f"SELECT COUNT(*) AS total_count FROM {tbl}")
            counts[tbl] = res["total_count"].iloc[0]

        logger.info("=== Table Record Counts ===")
        for tbl, cnt in counts.items():
            logger.info("  * %-22s: %d rows", tbl, cnt)

        # 2. Referential Integrity Check (Zero Orphaned FKs)
        orphan_check_query = """
        SELECT
            SUM(CASE WHEN s1.station_id IS NULL THEN 1 ELSE 0 END) AS orphaned_from_stations,
            SUM(CASE WHEN s2.station_id IS NULL THEN 1 ELSE 0 END) AS orphaned_to_stations,
            SUM(CASE WHEN dt.time_id IS NULL THEN 1 ELSE 0 END) AS orphaned_time_keys,
            SUM(CASE WHEN tk.ticket_type_id IS NULL THEN 1 ELSE 0 END) AS orphaned_ticket_keys
        FROM Fact_Ticket_Bookings f
        LEFT JOIN Dim_Station s1 ON f.from_station_id = s1.station_id
        LEFT JOIN Dim_Station s2 ON f.to_station_id = s2.station_id
        LEFT JOIN Dim_Time dt ON f.time_id = dt.time_id
        LEFT JOIN Dim_Ticket tk ON f.ticket_type_id = tk.ticket_type_id;
        """
        orphans = run_query(orphan_check_query)
        logger.info("=== Referential Integrity Validation ===")
        logger.info("  * Orphaned from_station_id : %s", orphans["orphaned_from_stations"].iloc[0])
        logger.info("  * Orphaned to_station_id   : %s", orphans["orphaned_to_stations"].iloc[0])
        logger.info("  * Orphaned time_id         : %s", orphans["orphaned_time_keys"].iloc[0])
        logger.info("  * Orphaned ticket_type_id  : %s", orphans["orphaned_ticket_keys"].iloc[0])

        # 3. Key Analytical Insights
        logger.info("\n=== Analytical Query 1: Busiest Peak Travel Hours ===")
        peak_query = """
        SELECT
            dt.hour,
            COUNT(f.booking_id) AS total_bookings,
            SUM(f.passengers) AS total_passengers,
            SUM(f.total_fare) AS total_revenue
        FROM Fact_Ticket_Bookings f
        JOIN Dim_Time dt ON f.time_id = dt.time_id
        GROUP BY dt.hour
        ORDER BY total_bookings DESC
        LIMIT 5;
        """
        peak_df = run_query(peak_query)
        print("\nTop 5 Peak Travel Hours:")
        print(peak_df.to_string(index=False))

        logger.info("\n=== Analytical Query 2: Top 5 Busiest Origin Stations ===")
        station_query = """
        SELECT
            s.station_name,
            s.railway_line,
            s.city,
            COUNT(f.booking_id) AS total_departures,
            SUM(f.passengers) AS total_passengers,
            SUM(f.total_fare) AS total_revenue
        FROM Fact_Ticket_Bookings f
        JOIN Dim_Station s ON f.from_station_id = s.station_id
        GROUP BY s.station_name, s.railway_line, s.city
        ORDER BY total_passengers DESC
        LIMIT 5;
        """
        station_df = run_query(station_query)
        print("\nTop 5 Origin Stations by Passenger Volume:")
        print(station_df.to_string(index=False))

        logger.info("\n=== Analytical Query 3: Revenue & Volume by Railway Line ===")
        line_query = """
        SELECT
            f.city,
            f.railway_line,
            COUNT(f.booking_id) AS total_bookings,
            SUM(f.passengers) AS total_passengers,
            SUM(f.total_fare) AS total_revenue,
            ROUND(AVG(f.total_fare), 2) AS avg_fare_per_booking
        FROM Fact_Ticket_Bookings f
        GROUP BY f.city, f.railway_line
        ORDER BY total_revenue DESC;
        """
        line_df = run_query(line_query)
        print("\nPerformance by Railway Line:")
        print(line_df.to_string(index=False))

        logger.info("\n=== Analytical Query 4: Ticket Type & Mode Breakdown ===")
        ticket_query = """
        SELECT
            tk.ticket_type,
            tk.booking_mode,
            COUNT(f.booking_id) AS bookings,
            SUM(f.passengers) AS passengers,
            SUM(f.total_fare) AS revenue
        FROM Fact_Ticket_Bookings f
        JOIN Dim_Ticket tk ON f.ticket_type_id = tk.ticket_type_id
        GROUP BY tk.ticket_type, tk.booking_mode
        ORDER BY bookings DESC;
        """
        ticket_df = run_query(ticket_query)
        print("\nTicket Type & Fulfillment Mode Performance:")
        print(ticket_df.to_string(index=False))

    # --------------------------------------------------------------------------
    # Main Execution Pipeline Runner
    # --------------------------------------------------------------------------
    def run(self):
        """Executes full end-to-end ETL flow."""
        start_time = time.time()
        logger.info("=" * 70)
        logger.info("STARTING UTS RAILWAY STAR SCHEMA ETL PIPELINE")
        logger.info("=" * 70)

        # 1. Apply Schema
        self.execute_schema_migration()

        # 2. Extract
        df_raw = self.extract()

        # 3. Transform
        dim_station, dim_time, dim_ticket, fact_ticket_bookings = self.transform(df_raw)

        # 4. Load
        self.load(dim_station, dim_time, dim_ticket, fact_ticket_bookings)

        # 5. Validate & Report
        self.validate_and_report()

        total_time = time.time() - start_time
        logger.info("=" * 70)
        logger.info("PIPELINE EXECUTION COMPLETED IN %.2f SECONDS", total_time)
        logger.info("=" * 70)


# ------------------------------------------------------------------------------
# CLI Entrypoint
# ------------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Automated UTS Railway Ticket ETL Pipeline")
    parser.add_argument("--csv-path", type=str, default="Uts_Data.csv", help="Path to raw Uts_Data.csv")
    parser.add_argument("--db-type", type=str, default="sqlite", choices=["sqlite", "postgres"], help="Database engine")
    parser.add_argument("--db-path", type=str, default="uts_railway.db", help="SQLite database file destination")
    parser.add_argument("--db-url", type=str, default=os.getenv("DATABASE_URL"), help="PostgreSQL connection URL")
    parser.add_argument("--chunksize", type=int, default=50000, help="Chunk size for batch database inserts")
    parser.add_argument("--no-recreate", action="store_true", help="Do not drop and recreate tables before loading")

    args = parser.parse_args()

    pipeline = UTSRailwayETL(
        csv_path=args.csv_path,
        db_type=args.db_type,
        db_path=args.db_path,
        db_url=args.db_url,
        chunksize=args.chunksize,
        recreate_schema=not args.no_recreate
    )
    pipeline.run()


if __name__ == "__main__":
    main()
