-- MIGRATION: Separate Room-Level and Bag-Level Sensors
-- Date: October 6, 2025
-- Purpose: Room sensors (temp, humidity, pH, EC, water level) are SHARED
--          Only substrate moisture is bag-specific

-- ============================================================
-- STEP 1: Create Room Sensors Table
-- ============================================================

CREATE TABLE IF NOT EXISTS room_sensors (
    reading_id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(50) DEFAULT 'main-room',  -- For future multi-room support
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    room_temp DECIMAL(4,1) NOT NULL,
    humidity INTEGER NOT NULL,
    ph DECIMAL(4,2) NOT NULL,
    ec DECIMAL(4,2) NOT NULL,
    water_level_status VARCHAR(20) DEFAULT 'Adequate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('room_sensors', 'timestamp', if_not_exists => TRUE);

-- Index for fast latest reading queries
CREATE INDEX IF NOT EXISTS idx_room_sensors_room_timestamp 
ON room_sensors (room_id, timestamp DESC);

-- ============================================================
-- STEP 2: Modify Sensor Readings to Only Store Moisture
-- ============================================================

-- Add room_id to sensor_readings for future multi-room support
ALTER TABLE sensor_readings 
ADD COLUMN IF NOT EXISTS room_id VARCHAR(50) DEFAULT 'main-room';

COMMENT ON TABLE sensor_readings IS 'Bag-specific sensor data. Room-level sensors are in room_sensors table.';
COMMENT ON COLUMN sensor_readings.substrate_moisture IS 'Bag-specific moisture level (0-100%)';
COMMENT ON COLUMN sensor_readings.room_id IS 'Links to room_sensors for environment data';

-- ============================================================
-- STEP 3: Migrate Existing Data
-- ============================================================

-- Copy one representative reading per timestamp to room_sensors
-- (Since all bags have same room conditions, pick from any bag)
INSERT INTO room_sensors (room_id, timestamp, room_temp, humidity, ph, ec, water_level_status)
SELECT DISTINCT ON (timestamp)
    'main-room' as room_id,
    timestamp,
    room_temp,
    humidity,
    ph,
    ec,
    water_level_status
FROM sensor_readings
WHERE timestamp >= NOW() - INTERVAL '7 days'  -- Only recent data
ORDER BY timestamp DESC, device_id
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 4: Create New Combined Query Function
-- ============================================================

CREATE OR REPLACE FUNCTION get_latest_sensor_readings_v2(device_ids VARCHAR[] DEFAULT NULL)
RETURNS TABLE (
    -- Room-level data (same for all bags)
    room_id VARCHAR(50),
    room_timestamp TIMESTAMP WITH TIME ZONE,
    room_temp DECIMAL(4,1),
    humidity INTEGER,
    ph DECIMAL(4,2),
    ec DECIMAL(4,2),
    water_level_status VARCHAR(20),
    -- Bag-specific data
    device_id VARCHAR(50),
    substrate_moisture INTEGER,
    moisture_timestamp TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_room AS (
        SELECT DISTINCT ON (rs.room_id)
            rs.room_id,
            rs.timestamp,
            rs.room_temp,
            rs.humidity,
            rs.ph,
            rs.ec,
            rs.water_level_status
        FROM room_sensors rs
        WHERE rs.room_id = 'main-room'
        ORDER BY rs.room_id, rs.timestamp DESC
    ),
    latest_bags AS (
        SELECT DISTINCT ON (sr.device_id)
            sr.device_id,
            sr.substrate_moisture,
            sr.timestamp,
            sr.room_id
        FROM sensor_readings sr
        WHERE (device_ids IS NULL OR sr.device_id = ANY(device_ids))
        ORDER BY sr.device_id, sr.timestamp DESC
    )
    SELECT 
        lr.room_id,
        lr.timestamp,
        lr.room_temp,
        lr.humidity,
        lr.ph,
        lr.ec,
        lr.water_level_status,
        lb.device_id,
        lb.substrate_moisture,
        lb.timestamp
    FROM latest_room lr
    CROSS JOIN latest_bags lb;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 5: Create Insert Functions
-- ============================================================

-- Insert room-level sensor reading
CREATE OR REPLACE FUNCTION insert_room_sensor_reading(
    p_room_id VARCHAR(50) DEFAULT 'main-room',
    p_room_temp DECIMAL(4,1),
    p_humidity INTEGER,
    p_ph DECIMAL(4,2),
    p_ec DECIMAL(4,2),
    p_water_level_status VARCHAR(20)
)
RETURNS BIGINT AS $$
DECLARE
    reading_id BIGINT;
BEGIN
    INSERT INTO room_sensors (
        room_id, room_temp, humidity, ph, ec, water_level_status
    ) VALUES (
        p_room_id, p_room_temp, p_humidity, p_ph, p_ec, p_water_level_status
    ) RETURNING room_sensors.reading_id INTO reading_id;
    
    RETURN reading_id;
END;
$$ LANGUAGE plpgsql;

-- Insert bag-specific moisture reading
CREATE OR REPLACE FUNCTION insert_bag_moisture_reading(
    p_device_id VARCHAR(50),
    p_substrate_moisture INTEGER,
    p_room_id VARCHAR(50) DEFAULT 'main-room'
)
RETURNS BIGINT AS $$
DECLARE
    reading_id BIGINT;
BEGIN
    INSERT INTO sensor_readings (
        device_id, substrate_moisture, room_id,
        -- Set dummy values for backwards compatibility (will be removed later)
        room_temp, humidity, ph, ec, water_level_status
    ) VALUES (
        p_device_id, p_substrate_moisture, p_room_id,
        0, 0, 0, 0, 'N/A'
    ) RETURNING sensor_readings.reading_id INTO reading_id;
    
    RETURN reading_id;
END;
$$ LANGUAGE plpgsql;

-- Combined insert (insert room sensors + multiple bag moisture readings)
CREATE OR REPLACE FUNCTION insert_combined_sensor_readings(
    p_room_id VARCHAR(50),
    p_room_temp DECIMAL(4,1),
    p_humidity INTEGER,
    p_ph DECIMAL(4,2),
    p_ec DECIMAL(4,2),
    p_water_level_status VARCHAR(20),
    p_device_ids VARCHAR[],
    p_moisture_values INTEGER[]
)
RETURNS BIGINT AS $$
DECLARE
    room_reading_id BIGINT;
    i INTEGER;
BEGIN
    -- Insert room sensors
    room_reading_id := insert_room_sensor_reading(
        p_room_id, p_room_temp, p_humidity, p_ph, p_ec, p_water_level_status
    );
    
    -- Insert moisture for each bag
    FOR i IN 1..array_length(p_device_ids, 1) LOOP
        PERFORM insert_bag_moisture_reading(
            p_device_ids[i], 
            p_moisture_values[i], 
            p_room_id
        );
    END LOOP;
    
    RETURN room_reading_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 6: Create Backward Compatible View (Optional)
-- ============================================================

CREATE OR REPLACE VIEW sensor_readings_unified AS
WITH latest_room AS (
    SELECT DISTINCT ON (room_id)
        room_id,
        timestamp,
        room_temp,
        humidity,
        ph,
        ec,
        water_level_status
    FROM room_sensors
    ORDER BY room_id, timestamp DESC
)
SELECT 
    sr.device_id,
    sr.timestamp,
    lr.room_temp,
    lr.humidity,
    lr.ph,
    lr.ec,
    sr.substrate_moisture,
    lr.water_level_status,
    sr.room_id
FROM sensor_readings sr
JOIN latest_room lr ON sr.room_id = lr.room_id;

-- ============================================================
-- STEP 7: Grant Permissions
-- ============================================================

GRANT SELECT, INSERT ON room_sensors TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE room_sensors_reading_id_seq TO PUBLIC;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check room sensors
-- SELECT * FROM room_sensors ORDER BY timestamp DESC LIMIT 5;

-- Check bag moisture
-- SELECT device_id, substrate_moisture, timestamp 
-- FROM sensor_readings ORDER BY timestamp DESC LIMIT 10;

-- Test new function
-- SELECT * FROM get_latest_sensor_readings_v2();

-- Test insert
-- SELECT insert_combined_sensor_readings(
--     'main-room', 22.5, 65, 6.2, 1.8, 'Adequate',
--     ARRAY['grow-bag-1', 'grow-bag-2', 'grow-bag-3'],
--     ARRAY[75, 72, 78]
-- );

COMMENT ON FUNCTION get_latest_sensor_readings_v2 IS 'Returns room-level sensors (shared) combined with bag-specific moisture levels';
COMMENT ON TABLE room_sensors IS 'Room-level environmental sensors - temperature, humidity, pH, EC, water level (shared across all bags)';
