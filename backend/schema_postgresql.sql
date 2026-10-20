-- ============================================================================
-- Star Schema Migration Script for PostgreSQL
-- Database: UTS Suburban Railway Analytics
-- ============================================================================

-- Drop tables in reverse dependency order if recreation is desired
-- DROP TABLE IF EXISTS Fact_Ticket_Bookings CASCADE;
-- DROP TABLE IF EXISTS Dim_Ticket CASCADE;
-- DROP TABLE IF EXISTS Dim_Time CASCADE;
-- DROP TABLE IF EXISTS Dim_Station CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Dimension Tables
-- ----------------------------------------------------------------------------

-- Dimension: Stations (Junctions and lines across suburban networks)
CREATE TABLE IF NOT EXISTS Dim_Station (
    station_id SERIAL PRIMARY KEY,
    station_name VARCHAR(100) NOT NULL,
    railway_line VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_station_line_city UNIQUE (station_name, railway_line, city)
);

COMMENT ON TABLE Dim_Station IS 'Dimension table capturing railway stations across suburban lines and cities.';
COMMENT ON COLUMN Dim_Station.station_id IS 'Surrogate primary key for station dimension.';
COMMENT ON COLUMN Dim_Station.station_name IS 'Station terminal or stop name.';
COMMENT ON COLUMN Dim_Station.railway_line IS 'Railway operating line (e.g. Western, Central, Harbour, Pune).';
COMMENT ON COLUMN Dim_Station.city IS 'Metropolitan operating region (e.g. Mumbai, Pune).';


-- Dimension: Time (Date, Month, Week, and Hour grain)
CREATE TABLE IF NOT EXISTS Dim_Time (
    time_id BIGINT PRIMARY KEY,              -- Format: YYYYMMDDHH (e.g. 2025071205)
    date DATE NOT NULL,
    month VARCHAR(10) NOT NULL,              -- Jan, Feb, Mar...
    week INTEGER NOT NULL CHECK (week >= 1 AND week <= 53),
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_time_date_hour UNIQUE (date, hour)
);

COMMENT ON TABLE Dim_Time IS 'Time dimension at hourly grain for temporal analysis and peak travel pattern tracking.';
COMMENT ON COLUMN Dim_Time.time_id IS 'Deterministic smart integer key in YYYYMMDDHH format.';
COMMENT ON COLUMN Dim_Time.hour IS 'Hour of day in 24-hour format (0-23).';


-- Dimension: Ticket Type and Booking Mode
CREATE TABLE IF NOT EXISTS Dim_Ticket (
    ticket_type_id SERIAL PRIMARY KEY,
    ticket_type VARCHAR(50) NOT NULL,        -- Single, Return, Monthly Pass
    booking_mode VARCHAR(50) NOT NULL,       -- Paper, Paperless
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ticket_type_mode UNIQUE (ticket_type, booking_mode)
);

COMMENT ON TABLE Dim_Ticket IS 'Dimension table classifying ticket categories and fulfillment channels.';


-- ----------------------------------------------------------------------------
-- 2. Fact Table: Fact_Ticket_Bookings
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS Fact_Ticket_Bookings (
    booking_id BIGSERIAL PRIMARY KEY,
    source_booking_id INTEGER,               -- 5-digit operational ticket sequence number from UTS
    date DATE NOT NULL,
    month VARCHAR(10) NOT NULL,
    week INTEGER NOT NULL,
    time TIME NOT NULL,
    ticket_type VARCHAR(50) NOT NULL,
    booking_mode VARCHAR(50) NOT NULL,
    from_station_id INTEGER NOT NULL REFERENCES Dim_Station (station_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    to_station_id INTEGER NOT NULL REFERENCES Dim_Station (station_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    time_id BIGINT REFERENCES Dim_Time (time_id) ON UPDATE CASCADE ON DELETE SET NULL,
    ticket_type_id INTEGER REFERENCES Dim_Ticket (ticket_type_id) ON UPDATE CASCADE ON DELETE SET NULL,
    passengers INTEGER NOT NULL CHECK (passengers > 0),
    total_fare NUMERIC(10, 2) NOT NULL CHECK (total_fare >= 0),
    payment_type VARCHAR(50) NOT NULL,       -- UPI, Cash, Wallet, Debit Card, Credit Card
    railway_line VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE Fact_Ticket_Bookings IS 'Central fact table recording suburban railway passenger journeys, revenue, and fulfillment.';
COMMENT ON COLUMN Fact_Ticket_Bookings.booking_id IS 'Unique surrogate primary key for fact record.';
COMMENT ON COLUMN Fact_Ticket_Bookings.source_booking_id IS 'Original operational sequence number extracted from ticketing machine roll.';
COMMENT ON COLUMN Fact_Ticket_Bookings.from_station_id IS 'Foreign key referencing origin station in Dim_Station.';
COMMENT ON COLUMN Fact_Ticket_Bookings.to_station_id IS 'Foreign key referencing destination station in Dim_Station.';
COMMENT ON COLUMN Fact_Ticket_Bookings.total_fare IS 'Total booking amount in INR (0.00 for seasonal Monthly Passes).';


-- ----------------------------------------------------------------------------
-- 3. High-Performance B-Tree Indexes
-- ----------------------------------------------------------------------------

-- Foreign Key Indexes for fast star joins
CREATE INDEX IF NOT EXISTS idx_fact_from_station ON Fact_Ticket_Bookings (from_station_id);
CREATE INDEX IF NOT EXISTS idx_fact_to_station ON Fact_Ticket_Bookings (to_station_id);
CREATE INDEX IF NOT EXISTS idx_fact_time_id ON Fact_Ticket_Bookings (time_id);
CREATE INDEX IF NOT EXISTS idx_fact_ticket_type_id ON Fact_Ticket_Bookings (ticket_type_id);

-- Slice & Dice Query Indexes
CREATE INDEX IF NOT EXISTS idx_fact_date ON Fact_Ticket_Bookings (date);
CREATE INDEX IF NOT EXISTS idx_fact_line_city ON Fact_Ticket_Bookings (city, railway_line);
CREATE INDEX IF NOT EXISTS idx_fact_payment_type ON Fact_Ticket_Bookings (payment_type);
CREATE INDEX IF NOT EXISTS idx_fact_ticket_type ON Fact_Ticket_Bookings (ticket_type);

-- Dimension Indexes
CREATE INDEX IF NOT EXISTS idx_dim_station_name ON Dim_Station (station_name);
CREATE INDEX IF NOT EXISTS idx_dim_time_date ON Dim_Time (date);
CREATE INDEX IF NOT EXISTS idx_dim_time_hour ON Dim_Time (hour);


-- ----------------------------------------------------------------------------
-- 4. Analytical Views for Reporting & BI
-- ----------------------------------------------------------------------------

-- View: Peak Travel Hours & Passenger Flow
CREATE OR REPLACE VIEW vw_peak_travel_hours AS
SELECT
    dt.hour,
    COUNT(f.booking_id) AS total_bookings,
    SUM(f.passengers) AS total_passengers,
    ROUND(SUM(f.total_fare), 2) AS total_revenue,
    ROUND(AVG(f.total_fare), 2) AS avg_fare_per_booking
FROM Fact_Ticket_Bookings f
JOIN Dim_Time dt ON f.time_id = dt.time_id
GROUP BY dt.hour
ORDER BY total_passengers DESC;

-- View: Station Traffic Matrix (Origin vs Destination)
CREATE OR REPLACE VIEW vw_station_traffic AS
SELECT
    s_from.station_name AS origin_station,
    s_to.station_name AS destination_station,
    f.railway_line,
    f.city,
    COUNT(f.booking_id) AS total_bookings,
    SUM(f.passengers) AS total_passengers,
    SUM(f.total_fare) AS total_revenue
FROM Fact_Ticket_Bookings f
JOIN Dim_Station s_from ON f.from_station_id = s_from.station_id
JOIN Dim_Station s_to ON f.to_station_id = s_to.station_id
GROUP BY s_from.station_name, s_to.station_name, f.railway_line, f.city
ORDER BY total_passengers DESC;
