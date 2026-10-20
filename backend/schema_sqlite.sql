-- ============================================================================
-- Star Schema Migration Script for SQLite
-- Database: UTS Suburban Railway Analytics
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. Dimension Tables
-- ----------------------------------------------------------------------------

-- Dimension: Stations (Junctions and lines across cities)
CREATE TABLE IF NOT EXISTS Dim_Station (
    station_id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_name TEXT NOT NULL,
    railway_line TEXT NOT NULL,
    city TEXT NOT NULL,
    CONSTRAINT uq_station_line_city UNIQUE (station_name, railway_line, city)
);

-- Dimension: Time (Date, Month, Week, and Hour grain)
CREATE TABLE IF NOT EXISTS Dim_Time (
    time_id INTEGER PRIMARY KEY,          -- Format: YYYYMMDDHH (e.g. 2025071205)
    date TEXT NOT NULL,                   -- ISO format: YYYY-MM-DD
    month TEXT NOT NULL,                  -- Jan, Feb, ...
    week INTEGER NOT NULL,                -- 1 to 53
    hour INTEGER NOT NULL,                -- 0 to 23
    CONSTRAINT uq_time_date_hour UNIQUE (date, hour)
);

-- Dimension: Ticket Type and Booking Mode
CREATE TABLE IF NOT EXISTS Dim_Ticket (
    ticket_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_type TEXT NOT NULL,            -- Single, Return, Monthly Pass
    booking_mode TEXT NOT NULL,           -- Paper, Paperless
    CONSTRAINT uq_ticket_type_mode UNIQUE (ticket_type, booking_mode)
);

-- ----------------------------------------------------------------------------
-- 2. Fact Table
-- ----------------------------------------------------------------------------

-- Fact: Ticket Bookings
CREATE TABLE IF NOT EXISTS Fact_Ticket_Bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_booking_id INTEGER,            -- Original 5-digit raw ticket sequence number
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    week INTEGER NOT NULL,
    time TEXT NOT NULL,
    ticket_type TEXT NOT NULL,
    booking_mode TEXT NOT NULL,
    from_station_id INTEGER NOT NULL,
    to_station_id INTEGER NOT NULL,
    time_id INTEGER,
    ticket_type_id INTEGER,
    passengers INTEGER NOT NULL CHECK (passengers > 0),
    total_fare INTEGER NOT NULL CHECK (total_fare >= 0),
    payment_type TEXT NOT NULL,
    railway_line TEXT NOT NULL,
    city TEXT NOT NULL,
    FOREIGN KEY (from_station_id) REFERENCES Dim_Station (station_id) ON DELETE RESTRICT,
    FOREIGN KEY (to_station_id) REFERENCES Dim_Station (station_id) ON DELETE RESTRICT,
    FOREIGN KEY (time_id) REFERENCES Dim_Time (time_id) ON DELETE SET NULL,
    FOREIGN KEY (ticket_type_id) REFERENCES Dim_Ticket (ticket_type_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 3. Indexes for OLAP Performance
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_fact_from_station ON Fact_Ticket_Bookings (from_station_id);
CREATE INDEX IF NOT EXISTS idx_fact_to_station ON Fact_Ticket_Bookings (to_station_id);
CREATE INDEX IF NOT EXISTS idx_fact_time_id ON Fact_Ticket_Bookings (time_id);
CREATE INDEX IF NOT EXISTS idx_fact_ticket_type_id ON Fact_Ticket_Bookings (ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_fact_date ON Fact_Ticket_Bookings (date);
CREATE INDEX IF NOT EXISTS idx_fact_line_city ON Fact_Ticket_Bookings (city, railway_line);
CREATE INDEX IF NOT EXISTS idx_fact_payment ON Fact_Ticket_Bookings (payment_type);

CREATE INDEX IF NOT EXISTS idx_dim_station_name ON Dim_Station (station_name);
CREATE INDEX IF NOT EXISTS idx_dim_time_date ON Dim_Time (date);
CREATE INDEX IF NOT EXISTS idx_dim_time_hour ON Dim_Time (hour);
