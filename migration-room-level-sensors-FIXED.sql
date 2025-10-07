-- =====================================================
-- FIXED: Room-Level Sensors Migration (Step by Step)
-- =====================================================
-- Run this file INSTEAD of migration-room-level-sensors.sql
-- This version works with existing data
-- =====================================================

-- STEP 1: Create room_sensors table if it doesn't exist
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

-- STEP 2: Convert to hypertable (safe if already exists)
SELECT create_hypertable('room_sensors', 'timestamp', if_not_exists => TRUE);

-- STEP 3: Create index
CREATE INDEX IF NOT EXISTS idx_room_sensors_room_timestamp 
ON room_sensors (room_id, timestamp DESC);

-- STEP 4: Add room_id to sensor_readings if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_readings' AND column_name = 'room_id'
    ) THEN
        ALTER TABLE sensor_readings ADD COLUMN room_id VARCHAR(50) DEFAULT 'main-room';
    END IF;
END $$;

-- STEP 5: Migrate data ONLY if room_sensors is empty
-- This prevents duplicate data errors
DO $$
DECLARE
    room_sensor_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO room_sensor_count FROM room_sensors;
    
    IF room_sensor_count = 0 THEN
        -- Migrate recent data from sensor_readings
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
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        ORDER BY timestamp DESC, device_id
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Migrated % readings to room_sensors', (SELECT COUNT(*) FROM room_sensors);
    ELSE
        RAISE NOTICE 'room_sensors already has % readings, skipping data migration', room_sensor_count;
    END IF;
END $$;

-- STEP 6: Add helpful comments
COMMENT ON TABLE room_sensors IS 'Room-level environmental sensors (temperature, humidity, pH, EC). Shared across all grow bags.';
COMMENT ON TABLE sensor_readings IS 'Bag-specific sensor data. Room-level sensors are in room_sensors table.';
COMMENT ON COLUMN sensor_readings.substrate_moisture IS 'Bag-specific moisture level (0-100%)';

-- STEP 7: Create query function
CREATE OR REPLACE FUNCTION get_latest_sensor_readings_v2(device_ids VARCHAR[] DEFAULT NULL)
RETURNS TABLE (
    room_id VARCHAR(50),
    room_timestamp TIMESTAMP WITH TIME ZONE,
    room_temp DECIMAL(4,1),
    humidity INTEGER,
    ph DECIMAL(4,2),
    ec DECIMAL(4,2),
    water_level_status VARCHAR(20),
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

-- STEP 8: Create insert helper functions
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
        device_id, substrate_moisture, room_id, timestamp,
        -- NULL for room-level values (use room_sensors instead)
        room_temp, humidity, ph, ec, water_level_status
    ) VALUES (
        p_device_id, p_substrate_moisture, p_room_id, CURRENT_TIMESTAMP,
        NULL, NULL, NULL, NULL, NULL
    ) RETURNING sensor_readings.reading_id INTO reading_id;
    
    RETURN reading_id;
END;
$$ LANGUAGE plpgsql;

-- Success!
DO $$
BEGIN
    RAISE NOTICE '✓ Room-level sensors migration completed successfully!';
    RAISE NOTICE '  - room_sensors table ready';
    RAISE NOTICE '  - Helper functions created';
    RAISE NOTICE '  - Data migration completed (if needed)';
END $$;
