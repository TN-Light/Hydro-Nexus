-- schema.sql for Hydro-Nexus (Updated)
-- PostgreSQL Database Schema

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable TimescaleDB for time-series data (optional but recommended)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS device_settings CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS crop_types CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create tables

-- Users (Enhanced with signup functionality)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255)
);

-- User Sessions for Authentication
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    UNIQUE(token)
);

-- User Settings (Enhanced with new notification preferences)
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    notification_preferences JSONB DEFAULT '{
        "masterEnabled": true,
        "rules": {
            "ph_critical": ["in_app", "push"],
            "ec_range": ["in_app"],
            "do_low": ["in_app", "push", "email"],
            "orp_low": ["in_app"],
            "high_humidity": ["in_app", "push"],
            "device_offline": ["in_app", "push", "email"]
        }
    }',
    dashboard_layout JSONB,
    measurement_units JSONB DEFAULT '{
        "temperature": "C", 
        "concentration": "ppm"
    }',
    dashboard_default_range VARCHAR(10) DEFAULT '24h',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crop Types
CREATE TABLE crop_types (
    crop_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    optimal_ph_min DECIMAL(4,2),
    optimal_ph_max DECIMAL(4,2),
    optimal_ec_min DECIMAL(4,2),
    optimal_ec_max DECIMAL(4,2),
    optimal_temp_min DECIMAL(4,1),
    optimal_temp_max DECIMAL(4,1),
    optimal_humidity_min INTEGER,
    optimal_humidity_max INTEGER,
    optimal_substrate_moisture_min INTEGER,
    optimal_substrate_moisture_max INTEGER,
    growing_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Devices (Grow Bags)
CREATE TABLE devices (
    device_id VARCHAR(50) PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    crop_id INTEGER REFERENCES crop_types(crop_id) ON DELETE SET NULL,
    firmware_version VARCHAR(20),
    last_connection TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT FALSE,
    battery_level INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Device Settings (Enhanced with new parameter structure)
CREATE TABLE device_settings (
    device_id VARCHAR(50) PRIMARY KEY REFERENCES devices(device_id) ON DELETE CASCADE,
    pump_enabled BOOLEAN DEFAULT FALSE,
    led_enabled BOOLEAN DEFAULT FALSE,
    dosing_enabled BOOLEAN DEFAULT FALSE,
    auto_dosing BOOLEAN DEFAULT FALSE,
    auto_dosing_schedule JSONB,
    nutrient_recipe JSONB,
    water_level_threshold DECIMAL(5,1) DEFAULT 20.0, -- cm
    -- Enhanced parameter thresholds with min/max structure
    parameter_thresholds JSONB DEFAULT '{
        "temperature": {"min": 20, "max": 28},
        "humidity": {"min": 60, "max": 80},
        "pH": {"min": 5.5, "max": 6.8},
        "ec": {"min": 1.2, "max": 2.4}
    }',
    -- Legacy notification thresholds (for backward compatibility)
    notification_thresholds JSONB DEFAULT '{
        "ph_min": 5.2, 
        "ph_max": 6.8, 
        "ec_min": 0.8, 
        "ec_max": 2.9, 
        "temp_min": 18.0, 
        "temp_max": 32.0,
        "moisture_min": 50,
        "humidity_max": 90
    }',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sensor Readings (main time-series data)
CREATE TABLE sensor_readings (
    reading_id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    room_temp DECIMAL(4,1), -- °C
    ph DECIMAL(4,2),
    ec DECIMAL(4,2), -- mS/cm
    substrate_moisture INTEGER, -- percentage
    water_level_status VARCHAR(20), -- "Adequate" or "Below Required Level"
    water_level_value DECIMAL(5,1), -- actual cm value if available
    humidity INTEGER, -- percentage
    raw_data JSONB -- for any additional sensor data
);

-- TimescaleDB best practice: primary key/unique indexes should include the time column.
-- Convert to composite primary key to allow hypertable conversion without errors.
ALTER TABLE sensor_readings DROP CONSTRAINT IF EXISTS sensor_readings_pkey;
ALTER TABLE sensor_readings ADD CONSTRAINT sensor_readings_pkey PRIMARY KEY (reading_id, timestamp);

-- Create index on device_id and timestamp for faster queries
CREATE INDEX idx_sensor_readings_device_timestamp 
ON sensor_readings(device_id, timestamp);

-- Convert sensor_readings to a TimescaleDB hypertable for better time-series performance
-- SELECT create_hypertable('sensor_readings', 'timestamp');

-- Alerts (Enhanced with new severity system)
CREATE TABLE alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL,
    -- Enhanced severity system: info, warning, alert, error
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'alert', 'error')),
    parameter VARCHAR(20), -- ph, ec, room_temp, moisture, water_level, humidity
    value TEXT, -- the value that triggered the alert
    threshold_type VARCHAR(20), -- 'warning' (±2), 'alert' (±4), 'system_error'
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    dismissed_by UUID[] DEFAULT '{}'
);

-- Daily aggregated statistics for faster analytics queries
CREATE TABLE daily_stats (
    stats_id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    avg_room_temp DECIMAL(4,1),
    min_room_temp DECIMAL(4,1),
    max_room_temp DECIMAL(4,1),
    avg_ph DECIMAL(4,2),
    min_ph DECIMAL(4,2),
    max_ph DECIMAL(4,2),
    avg_ec DECIMAL(4,2),
    min_ec DECIMAL(4,2),
    max_ec DECIMAL(4,2),
    avg_moisture DECIMAL(5,2),
    min_moisture INTEGER,
    max_moisture INTEGER,
    avg_humidity DECIMAL(5,2),
    min_humidity INTEGER,
    max_humidity INTEGER,
    water_level_alerts INTEGER DEFAULT 0,
    warning_alerts INTEGER DEFAULT 0,
    alert_alerts INTEGER DEFAULT 0,
    error_alerts INTEGER DEFAULT 0,
    total_alerts INTEGER DEFAULT 0,
    UNIQUE(device_id, date)
);

-- Insert sample data

-- Insert default admin user (password: admin)
INSERT INTO users (user_id, username, email, password_hash, full_name, first_name, last_name, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    'admin@hydro-nexus.com',
    '$2b$10$dS3vOF69bCVGERPs5gY1I.fJNXx9tby9ZDVb.68B.ZloS9vKFQFJa', -- 'admin' hashed with bcrypt
    'Admin User',
    'Admin',
    'User',
    'admin'
);

-- Insert sample registered user from localStorage simulation
INSERT INTO users (username, email, password_hash, full_name, first_name, last_name, role)
VALUES (
    'testuser',
    'test@example.com',
    '$2b$10$example.hash.here', -- would be actual bcrypt hash
    'Test User',
    'Test',
    'User',
    'user'
);

-- Insert user settings for admin
INSERT INTO user_settings (user_id)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Insert common crop types with optimal growing parameters
INSERT INTO crop_types (name, optimal_ph_min, optimal_ph_max, optimal_ec_min, optimal_ec_max, optimal_temp_min, optimal_temp_max, optimal_humidity_min, optimal_humidity_max, optimal_substrate_moisture_min, optimal_substrate_moisture_max, growing_notes)
VALUES
    ('Tomato', 5.5, 6.5, 2.0, 3.5, 20.0, 26.0, 60, 80, 60, 80, 'Tomatoes prefer consistent moisture and benefit from calcium supplementation.'),
    ('Lettuce', 5.8, 6.2, 0.8, 1.2, 15.0, 22.0, 50, 70, 60, 75, 'Lettuce prefers cooler temperatures and lower EC levels.'),
    ('Basil', 5.5, 6.5, 1.0, 1.6, 20.0, 28.0, 60, 80, 60, 80, 'Basil is sensitive to cold and requires good airflow to prevent disease.'),
    ('Spinach', 6.0, 7.0, 1.8, 2.3, 16.0, 24.0, 50, 70, 60, 75, 'Spinach prefers cooler temperatures and higher pH compared to other leafy greens.');

-- Insert sample devices
INSERT INTO devices (device_id, user_id, name, location, crop_id, firmware_version, last_connection, is_online, battery_level)
VALUES
    ('grow-bag-1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tomato Grow Bag 1', 'Greenhouse Row 1', 1, 'v1.2.3', CURRENT_TIMESTAMP, TRUE, 95),
    ('grow-bag-2', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Lettuce Grow Bag 1', 'Greenhouse Row 1', 2, 'v1.2.3', CURRENT_TIMESTAMP, TRUE, 92),
    ('grow-bag-3', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Basil Grow Bag 1', 'Greenhouse Row 2', 3, 'v1.2.3', CURRENT_TIMESTAMP, TRUE, 88),
    ('grow-bag-4', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Spinach Grow Bag 1', 'Greenhouse Row 2', 4, 'v1.2.3', CURRENT_TIMESTAMP, TRUE, 90),
    ('grow-bag-5', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tomato Grow Bag 2', 'Greenhouse Row 3', 1, 'v1.2.3', CURRENT_TIMESTAMP, TRUE, 85),
    ('grow-bag-6', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Lettuce Grow Bag 2', 'Greenhouse Row 3', 2, 'v1.2.3', CURRENT_TIMESTAMP, TRUE, 89);

-- Insert device settings with updated parameter structure
INSERT INTO device_settings (device_id, parameter_thresholds)
SELECT device_id, '{
    "temperature": {"min": 20, "max": 28},
    "humidity": {"min": 60, "max": 80},
    "pH": {"min": 5.5, "max": 6.8},
    "ec": {"min": 1.2, "max": 2.4}
}'::jsonb
FROM devices;

-- Create views for easier data access

-- Current sensor readings view
CREATE OR REPLACE VIEW current_readings AS
SELECT d.name AS device_name, d.device_id, ct.name AS crop_type,
    sr.timestamp, sr.room_temp, sr.ph, sr.ec, sr.substrate_moisture, 
    sr.water_level_status, sr.humidity
FROM sensor_readings sr
JOIN devices d ON sr.device_id = d.device_id
LEFT JOIN crop_types ct ON d.crop_id = ct.crop_id
WHERE sr.timestamp = (
    SELECT MAX(timestamp) 
    FROM sensor_readings 
    WHERE device_id = sr.device_id
);

-- Active alerts view (updated with new severity system)
CREATE OR REPLACE VIEW active_alerts AS
SELECT a.alert_id, a.device_id, d.name AS device_name, 
    a.timestamp, a.message, a.severity, a.parameter, a.value, a.threshold_type,
    a.dismissed_by
FROM alerts a
JOIN devices d ON a.device_id = d.device_id
WHERE a.acknowledged = FALSE
  AND a.resolved_at IS NULL
ORDER BY 
    CASE a.severity 
        WHEN 'error' THEN 1
        WHEN 'alert' THEN 2  
        WHEN 'warning' THEN 3
        WHEN 'info' THEN 4
    END,
    a.timestamp DESC;

-- Create functions

-- Function to insert a new sensor reading
CREATE OR REPLACE FUNCTION insert_sensor_reading(
    p_device_id VARCHAR(50),
    p_room_temp DECIMAL(4,1),
    p_ph DECIMAL(4,2),
    p_ec DECIMAL(4,2),
    p_substrate_moisture INTEGER,
    p_water_level_status VARCHAR(20),
    p_water_level_value DECIMAL(5,1),
    p_humidity INTEGER
) RETURNS BIGINT AS $$
DECLARE
    new_reading_id BIGINT;
BEGIN
    -- Update device last connection and online status
    UPDATE devices 
    SET last_connection = CURRENT_TIMESTAMP, is_online = TRUE 
    WHERE device_id = p_device_id;
    
    -- Insert the sensor reading
    INSERT INTO sensor_readings 
        (device_id, room_temp, ph, ec, substrate_moisture, water_level_status, water_level_value, humidity)
    VALUES 
        (p_device_id, p_room_temp, p_ph, p_ec, p_substrate_moisture, p_water_level_status, p_water_level_value, p_humidity)
    RETURNING reading_id INTO new_reading_id;
    
    RETURN new_reading_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to create an alert with threshold type
CREATE OR REPLACE FUNCTION create_alert(
    p_device_id VARCHAR(50),
    p_message TEXT,
    p_severity VARCHAR(20),
    p_parameter VARCHAR(20),
    p_value TEXT,
    p_threshold_type VARCHAR(20) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_alert_id UUID;
BEGIN
    INSERT INTO alerts 
        (device_id, message, severity, parameter, value, threshold_type)
    VALUES 
        (p_device_id, p_message, p_severity, p_parameter, p_value, p_threshold_type)
    RETURNING alert_id INTO new_alert_id;
    
    RETURN new_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to acknowledge an alert
CREATE OR REPLACE FUNCTION acknowledge_alert(
    p_alert_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE alerts
    SET acknowledged = TRUE,
        acknowledged_by = p_user_id,
        acknowledged_at = CURRENT_TIMESTAMP
    WHERE alert_id = p_alert_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to check sensor thresholds and generate alerts
CREATE OR REPLACE FUNCTION check_sensor_thresholds(
    p_device_id VARCHAR(50),
    p_room_temp DECIMAL(4,1),
    p_ph DECIMAL(4,2),
    p_ec DECIMAL(4,2),
    p_humidity INTEGER
) RETURNS INTEGER AS $$
DECLARE
    device_thresholds JSONB;
    alerts_created INTEGER := 0;
    temp_range JSONB;
    ph_range JSONB;
    ec_range JSONB;
    humidity_range JSONB;
BEGIN
    -- Get device parameter thresholds
    SELECT parameter_thresholds INTO device_thresholds
    FROM device_settings
    WHERE device_id = p_device_id;
    
    IF device_thresholds IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Extract ranges
    temp_range := device_thresholds->'temperature';
    ph_range := device_thresholds->'pH';
    ec_range := device_thresholds->'ec';
    humidity_range := device_thresholds->'humidity';
    
    -- Check temperature (±4 = alert, ±2 = warning)
    IF p_room_temp IS NOT NULL AND temp_range IS NOT NULL THEN
        IF p_room_temp < (temp_range->>'min')::DECIMAL - 4 OR p_room_temp > (temp_range->>'max')::DECIMAL + 4 THEN
            PERFORM create_alert(p_device_id, 
                FORMAT('Temperature alert: %s°C (Range: %s-%s°C)', 
                    p_room_temp, temp_range->>'min', temp_range->>'max'),
                'alert', 'temperature', p_room_temp::TEXT, 'alert');
            alerts_created := alerts_created + 1;
        END IF;
    END IF;
    
    -- Check pH (±4 = alert)
    IF p_ph IS NOT NULL AND ph_range IS NOT NULL THEN
        IF p_ph < (ph_range->>'min')::DECIMAL - 4 OR p_ph > (ph_range->>'max')::DECIMAL + 4 THEN
            PERFORM create_alert(p_device_id,
                FORMAT('pH alert: %s (Range: %s-%s)', 
                    p_ph, ph_range->>'min', ph_range->>'max'),
                'alert', 'ph', p_ph::TEXT, 'alert');
            alerts_created := alerts_created + 1;
        END IF;
    END IF;
    
    -- Check EC (±4 = alert)
    IF p_ec IS NOT NULL AND ec_range IS NOT NULL THEN
        IF p_ec < (ec_range->>'min')::DECIMAL - 4 OR p_ec > (ec_range->>'max')::DECIMAL + 4 THEN
            PERFORM create_alert(p_device_id,
                FORMAT('EC alert: %s mS/cm (Range: %s-%s mS/cm)', 
                    p_ec, ec_range->>'min', ec_range->>'max'),
                'alert', 'ec', p_ec::TEXT, 'alert');
            alerts_created := alerts_created + 1;
        END IF;
    END IF;
    
    -- Check humidity (±4 = alert)
    IF p_humidity IS NOT NULL AND humidity_range IS NOT NULL THEN
        IF p_humidity < (humidity_range->>'min')::INTEGER - 4 OR p_humidity > (humidity_range->>'max')::INTEGER + 4 THEN
            PERFORM create_alert(p_device_id,
                FORMAT('Humidity alert: %s%% (Range: %s-%s%%)', 
                    p_humidity, humidity_range->>'min', humidity_range->>'max'),
                'alert', 'humidity', p_humidity::TEXT, 'alert');
            alerts_created := alerts_created + 1;
        END IF;
    END IF;
    
    RETURN alerts_created;
END;
$$ LANGUAGE plpgsql;

-- Create triggers

-- Trigger to update device "updated_at" when settings change
CREATE OR REPLACE FUNCTION update_device_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE devices SET updated_at = CURRENT_TIMESTAMP WHERE device_id = NEW.device_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_settings_updated
AFTER UPDATE ON device_settings
FOR EACH ROW
EXECUTE FUNCTION update_device_timestamp();

-- Trigger to update user "updated_at" when settings change
CREATE OR REPLACE FUNCTION update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated
AFTER UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_user_timestamp();

-- Trigger to automatically check thresholds when new sensor data is inserted
CREATE OR REPLACE FUNCTION auto_check_thresholds()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM check_sensor_thresholds(
        NEW.device_id, 
        NEW.room_temp, 
        NEW.ph, 
        NEW.ec, 
        NEW.humidity
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sensor_reading_threshold_check
AFTER INSERT ON sensor_readings
FOR EACH ROW
EXECUTE FUNCTION auto_check_thresholds();

-- Set permissions (assuming application will connect as 'hydro_user')
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hydro_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hydro_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hydro_user;

-- Create indexes for performance

-- Create an index for faster alert queries
CREATE INDEX idx_alerts_device_acknowledged ON alerts(device_id, acknowledged);
CREATE INDEX idx_alerts_severity_timestamp ON alerts(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON alerts USING GIN (dismissed_by);

-- Create index for faster daily stats queries
CREATE INDEX idx_daily_stats_device_date ON daily_stats(device_id, date);

-- Create index for user authentication
CREATE INDEX idx_users_username_active ON users(username, is_active);
CREATE INDEX idx_users_email_active ON users(email, is_active);

-- Create index for user sessions
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_user_expires ON user_sessions(user_id, expires_at);

-- Comments for documentation
COMMENT ON TABLE sensor_readings IS 'Stores all sensor data from grow bags with timestamps';
COMMENT ON TABLE devices IS 'Represents physical grow bag devices in the system';
COMMENT ON TABLE alerts IS 'System alerts generated from sensor data anomalies with enhanced severity system (info, warning, alert, error)';
COMMENT ON TABLE users IS 'User accounts with enhanced signup and authentication features';
COMMENT ON TABLE user_settings IS 'User preferences including enhanced notification system';
COMMENT ON COLUMN alerts.severity IS 'Alert severity: info (informational), warning (±2 component-only), alert (±4 with notifications), error (system critical)';
COMMENT ON COLUMN alerts.threshold_type IS 'Type of threshold violation: warning, alert, or system_error';
COMMENT ON COLUMN device_settings.parameter_thresholds IS 'JSON object containing min/max ranges for each parameter used in ±2/±4 logic';