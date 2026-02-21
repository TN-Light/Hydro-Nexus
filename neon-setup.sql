-- =====================================================
-- Hydro-Nexus: Complete Neon Database Setup
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    UNIQUE(token)
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    notification_preferences JSONB DEFAULT '{"masterEnabled": true}',
    dashboard_layout JSONB,
    measurement_units JSONB DEFAULT '{"temperature": "C", "concentration": "ppm"}',
    dashboard_default_range VARCHAR(10) DEFAULT '24h',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crop_types (
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

CREATE TABLE IF NOT EXISTS devices (
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

CREATE TABLE IF NOT EXISTS device_settings (
    device_id VARCHAR(50) PRIMARY KEY REFERENCES devices(device_id) ON DELETE CASCADE,
    pump_enabled BOOLEAN DEFAULT FALSE,
    led_enabled BOOLEAN DEFAULT FALSE,
    dosing_enabled BOOLEAN DEFAULT FALSE,
    auto_dosing BOOLEAN DEFAULT FALSE,
    auto_dosing_schedule JSONB,
    nutrient_recipe JSONB,
    water_level_threshold DECIMAL(5,1) DEFAULT 20.0,
    parameter_thresholds JSONB DEFAULT '{"temperature": {"min": 20, "max": 28}, "humidity": {"min": 60, "max": 80}, "pH": {"min": 5.5, "max": 6.8}, "ec": {"min": 1.2, "max": 2.4}}',
    notification_thresholds JSONB DEFAULT '{"ph_min": 5.2, "ph_max": 6.8, "ec_min": 0.8, "ec_max": 2.9, "temp_min": 18.0, "temp_max": 32.0, "moisture_min": 50, "humidity_max": 90}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    reading_id BIGSERIAL,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    room_temp DECIMAL(4,1),
    ph DECIMAL(4,2),
    ec DECIMAL(4,2),
    substrate_moisture INTEGER,
    water_level_status VARCHAR(20),
    water_level_value DECIMAL(5,1),
    humidity INTEGER,
    room_id VARCHAR(50) DEFAULT 'main-room',
    raw_data JSONB,
    PRIMARY KEY (reading_id, timestamp)
);

CREATE TABLE IF NOT EXISTS room_sensors (
    reading_id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(50) DEFAULT 'main-room',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    room_temp DECIMAL(4,1) NOT NULL,
    humidity INTEGER NOT NULL,
    ph DECIMAL(4,2) NOT NULL,
    ec DECIMAL(4,2) NOT NULL,
    water_level_status VARCHAR(20) DEFAULT 'Adequate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'alert', 'error')),
    parameter VARCHAR(20),
    value TEXT,
    threshold_type VARCHAR(20),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    dismissed_by UUID[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS daily_stats (
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

-- =====================================================
-- DEVICE COMMANDS TABLE (for pump control)
-- =====================================================
CREATE TABLE IF NOT EXISTS device_commands (
    command_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    parameters JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes')
);

-- =====================================================
-- USER PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'en',
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    dashboard_layout VARCHAR(20) DEFAULT 'grid',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    alert_sound BOOLEAN DEFAULT TRUE,
    notification_frequency VARCHAR(20) DEFAULT 'immediate',
    temperature_unit VARCHAR(10) DEFAULT 'celsius',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    time_format VARCHAR(10) DEFAULT '24h',
    timezone VARCHAR(50) DEFAULT 'UTC',
    default_chart_period VARCHAR(20) DEFAULT '24h',
    chart_animation BOOLEAN DEFAULT TRUE,
    advanced_mode BOOLEAN DEFAULT FALSE,
    developer_mode BOOLEAN DEFAULT FALSE,
    auto_refresh BOOLEAN DEFAULT TRUE,
    refresh_interval INTEGER DEFAULT 30,
    custom_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- =====================================================
-- USER PARAMETERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_parameters (
    parameter_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_id VARCHAR(100),
    crop_id INTEGER REFERENCES crop_types(crop_id) ON DELETE SET NULL,
    parameter_ranges JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id, crop_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_timestamp ON sensor_readings(device_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_room_sensors_room_timestamp ON room_sensors(room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_device_acknowledged ON alerts(device_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_timestamp ON alerts(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON alerts USING GIN (dismissed_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_device_date ON daily_stats(device_id, date);
CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username, is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires ON user_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_device_commands_device_status ON device_commands(device_id, status);
CREATE INDEX IF NOT EXISTS idx_device_commands_expires ON device_commands(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_parameters_user_id ON user_parameters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_parameters_user_device ON user_parameters(user_id, device_id);

-- =====================================================
-- VIEWS
-- =====================================================
CREATE OR REPLACE VIEW current_readings AS
SELECT d.name AS device_name, d.device_id, ct.name AS crop_type,
    sr.timestamp, sr.room_temp, sr.ph, sr.ec, sr.substrate_moisture, 
    sr.water_level_status, sr.humidity
FROM sensor_readings sr
JOIN devices d ON sr.device_id = d.device_id
LEFT JOIN crop_types ct ON d.crop_id = ct.crop_id
WHERE sr.timestamp = (
    SELECT MAX(timestamp) FROM sensor_readings WHERE device_id = sr.device_id
);

CREATE OR REPLACE VIEW active_alerts AS
SELECT a.alert_id, a.device_id, d.name AS device_name, 
    a.timestamp, a.message, a.severity, a.parameter, a.value, a.threshold_type,
    a.dismissed_by
FROM alerts a
JOIN devices d ON a.device_id = d.device_id
WHERE a.acknowledged = FALSE AND a.resolved_at IS NULL
ORDER BY 
    CASE a.severity WHEN 'error' THEN 1 WHEN 'alert' THEN 2 WHEN 'warning' THEN 3 WHEN 'info' THEN 4 END,
    a.timestamp DESC;

-- =====================================================
-- FUNCTIONS
-- =====================================================
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
    UPDATE devices SET last_connection = CURRENT_TIMESTAMP, is_online = TRUE WHERE device_id = p_device_id;
    INSERT INTO sensor_readings (device_id, room_temp, ph, ec, substrate_moisture, water_level_status, water_level_value, humidity)
    VALUES (p_device_id, p_room_temp, p_ph, p_ec, p_substrate_moisture, p_water_level_status, p_water_level_value, p_humidity)
    RETURNING reading_id INTO new_reading_id;
    RETURN new_reading_id;
END;
$$ LANGUAGE plpgsql;

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
    INSERT INTO alerts (device_id, message, severity, parameter, value, threshold_type)
    VALUES (p_device_id, p_message, p_severity, p_parameter, p_value, p_threshold_type)
    RETURNING alert_id INTO new_alert_id;
    RETURN new_alert_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_device_timestamp() RETURNS TRIGGER AS $$
BEGIN
    UPDATE devices SET updated_at = CURRENT_TIMESTAMP WHERE device_id = NEW.device_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS device_settings_updated ON device_settings;
CREATE TRIGGER device_settings_updated AFTER UPDATE ON device_settings FOR EACH ROW EXECUTE FUNCTION update_device_timestamp();

CREATE OR REPLACE FUNCTION update_user_timestamp() RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_settings_updated ON user_settings;
CREATE TRIGGER user_settings_updated AFTER UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_user_timestamp();

CREATE OR REPLACE FUNCTION update_user_preferences_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_preferences_update_timestamp ON user_preferences;
CREATE TRIGGER user_preferences_update_timestamp BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_user_preferences_timestamp();

CREATE OR REPLACE FUNCTION update_user_parameters_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_parameters_update_timestamp ON user_parameters;
CREATE TRIGGER user_parameters_update_timestamp BEFORE UPDATE ON user_parameters FOR EACH ROW EXECUTE FUNCTION update_user_parameters_timestamp();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default admin user (password: admin)
INSERT INTO users (user_id, username, email, password_hash, full_name, first_name, last_name, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    'admin@hydro-nexus.com',
    '$2b$10$dS3vOF69bCVGERPs5gY1I.fJNXx9tby9ZDVb.68B.ZloS9vKFQFJa',
    'Admin User', 'Admin', 'User', 'admin'
) ON CONFLICT (username) DO NOTHING;

INSERT INTO user_settings (user_id) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') ON CONFLICT DO NOTHING;

-- Crop types
INSERT INTO crop_types (name, optimal_ph_min, optimal_ph_max, optimal_ec_min, optimal_ec_max, optimal_temp_min, optimal_temp_max, optimal_humidity_min, optimal_humidity_max, optimal_substrate_moisture_min, optimal_substrate_moisture_max, growing_notes)
VALUES
    ('Tomato', 5.5, 6.5, 2.0, 3.5, 20.0, 26.0, 60, 80, 60, 80, 'Tomatoes prefer consistent moisture.'),
    ('Lettuce', 5.8, 6.2, 0.8, 1.2, 15.0, 22.0, 50, 70, 60, 75, 'Lettuce prefers cooler temperatures.'),
    ('Basil', 5.5, 6.5, 1.0, 1.6, 20.0, 28.0, 60, 80, 60, 80, 'Basil is sensitive to cold.'),
    ('Spinach', 6.0, 7.0, 1.8, 2.3, 16.0, 24.0, 50, 70, 60, 75, 'Spinach prefers cooler temperatures.')
ON CONFLICT (name) DO NOTHING;

-- Devices (grow bags)
INSERT INTO devices (device_id, user_id, name, location, crop_id, firmware_version, last_connection, is_online)
VALUES
    ('grow-bag-1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tomato Grow Bag 1', 'Greenhouse Row 1', 1, 'v4.0', CURRENT_TIMESTAMP, TRUE),
    ('grow-bag-2', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Lettuce Grow Bag 1', 'Greenhouse Row 1', 2, 'v4.0', CURRENT_TIMESTAMP, FALSE),
    ('grow-bag-3', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Basil Grow Bag 1', 'Greenhouse Row 2', 3, 'v4.0', CURRENT_TIMESTAMP, FALSE),
    ('grow-bag-4', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Spinach Grow Bag 1', 'Greenhouse Row 2', 4, 'v4.0', CURRENT_TIMESTAMP, FALSE)
ON CONFLICT (device_id) DO NOTHING;

-- Device settings
INSERT INTO device_settings (device_id) SELECT device_id FROM devices ON CONFLICT DO NOTHING;
