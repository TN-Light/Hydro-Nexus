-- Complete Working TimescaleDB Schema Fix
-- Run this after your main schema is created

-- Ensure TimescaleDB is installed (required for hypertables and time_bucket)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Step 1: Check current table structure
DO $$
BEGIN
    -- Check if sensor_readings table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'sensor_readings') THEN
        RAISE NOTICE 'sensor_readings table exists';
        
        -- Check if it's already a hypertable
        IF EXISTS (SELECT FROM timescaledb_information.hypertables WHERE hypertable_name = 'sensor_readings') THEN
            RAISE NOTICE 'sensor_readings is already a hypertable';
        ELSE
            RAISE NOTICE 'sensor_readings exists but is not a hypertable yet';
        END IF;
    ELSE
        RAISE NOTICE 'sensor_readings table does not exist - run main schema first';
    END IF;
END $$;

-- Step 2: Fix primary key issue for TimescaleDB
-- TimescaleDB requires timestamp to be part of primary key for unique constraints

-- Check current primary key
SELECT 
    tc.constraint_name, 
    kcu.column_name,
    kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'sensor_readings' 
    AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY kcu.ordinal_position;

-- Option A: If reading_id is the only primary key, create composite key
DO $$
BEGIN
    -- Drop existing primary key if it doesn't include timestamp
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'sensor_readings' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name NOT IN (
            SELECT constraint_name FROM information_schema.key_column_usage 
            WHERE table_name = 'sensor_readings' AND column_name = 'timestamp'
        )
    ) THEN
        RAISE NOTICE 'Dropping existing primary key to create composite key';
        ALTER TABLE sensor_readings DROP CONSTRAINT sensor_readings_pkey CASCADE;
        
        -- Create composite primary key with timestamp
        ALTER TABLE sensor_readings ADD CONSTRAINT sensor_readings_pkey 
        PRIMARY KEY (reading_id, timestamp);
        
        RAISE NOTICE 'Created composite primary key (reading_id, timestamp)';
    END IF;
END $$;

-- Step 3: Create hypertable
SELECT create_hypertable(
    'sensor_readings', 
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Step 4: Create API key table (fixed foreign key reference)
CREATE TABLE IF NOT EXISTS api_keys (
    key_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key VARCHAR(64) UNIQUE NOT NULL,
    device_id VARCHAR(50) NOT NULL, -- Remove FK constraint for now
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Step 5: Create device commands table
CREATE TABLE IF NOT EXISTS device_commands (
    command_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    parameters JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    result TEXT
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_timestamp 
ON sensor_readings (device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp 
ON sensor_readings (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_keys_key 
ON api_keys (api_key) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_device_commands_device_status 
ON device_commands (device_id, status, expires_at);

-- Step 7: Insert sample API keys
INSERT INTO api_keys (api_key, device_id, name) VALUES
('esp32_grow_bag_1_key_2024_secure', 'grow-bag-1', 'ESP32 Grow Bag 1'),
('esp32_grow_bag_2_key_2024_secure', 'grow-bag-2', 'ESP32 Grow Bag 2'),
('esp32_grow_bag_3_key_2024_secure', 'grow-bag-3', 'ESP32 Grow Bag 3'),
('esp32_grow_bag_4_key_2024_secure', 'grow-bag-4', 'ESP32 Grow Bag 4'),
('esp32_grow_bag_5_key_2024_secure', 'grow-bag-5', 'ESP32 Grow Bag 5'),
('esp32_grow_bag_6_key_2024_secure', 'grow-bag-6', 'ESP32 Grow Bag 6')
ON CONFLICT (api_key) DO NOTHING;

-- Step 8: Database functions
CREATE OR REPLACE FUNCTION get_latest_sensor_readings(device_ids VARCHAR[] DEFAULT NULL)
RETURNS TABLE (
    device_id VARCHAR(50),
    reading_timestamp TIMESTAMP WITH TIME ZONE,
    room_temp DECIMAL(4,1),
    ph DECIMAL(4,2),
    ec DECIMAL(4,2),
    substrate_moisture INTEGER,
    water_level_status VARCHAR(20),
    humidity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (sr.device_id)
        sr.device_id,
        sr.timestamp,
        sr.room_temp,
        sr.ph,
        sr.ec,
        sr.substrate_moisture,
        sr.water_level_status,
        sr.humidity
    FROM sensor_readings sr
    WHERE (device_ids IS NULL OR sr.device_id = ANY(device_ids))
    ORDER BY sr.device_id, sr.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Range query used by analytics endpoints (aggregated buckets)
CREATE OR REPLACE FUNCTION get_sensor_readings_range(
    device_ids VARCHAR[] DEFAULT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    interval_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    device_id VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE,
    room_temp DECIMAL(4,1),
    ph DECIMAL(4,2),
    ec DECIMAL(4,2),
    substrate_moisture INTEGER,
    water_level_status VARCHAR(20),
    humidity INTEGER,
    reading_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.device_id,
        time_bucket(INTERVAL '1 minute' * interval_minutes, sr.timestamp) AS timestamp,
        AVG(sr.room_temp)::DECIMAL(4,1) AS room_temp,
        AVG(sr.ph)::DECIMAL(4,2) AS ph,
        AVG(sr.ec)::DECIMAL(4,2) AS ec,
        AVG(sr.substrate_moisture)::INTEGER AS substrate_moisture,
        (array_agg(sr.water_level_status ORDER BY sr.timestamp DESC))[1] AS water_level_status,
        AVG(sr.humidity)::INTEGER AS humidity,
        COUNT(*) AS reading_count
    FROM sensor_readings sr
    WHERE sr.timestamp >= start_time
      AND sr.timestamp <= end_time
      AND (device_ids IS NULL OR sr.device_id = ANY(device_ids))
    GROUP BY sr.device_id, time_bucket(INTERVAL '1 minute' * interval_minutes, sr.timestamp)
    ORDER BY sr.device_id, timestamp;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION insert_sensor_reading(
    p_device_id VARCHAR(50),
    p_room_temp DECIMAL(4,1),
    p_ph DECIMAL(4,2),
    p_ec DECIMAL(4,2),
    p_substrate_moisture INTEGER,
    p_water_level_status VARCHAR(20),
    p_humidity INTEGER
)
RETURNS BIGINT AS $$
DECLARE
    reading_id BIGINT;
BEGIN
    INSERT INTO sensor_readings (
        device_id, room_temp, ph, ec, substrate_moisture, water_level_status, humidity
    ) VALUES (
        p_device_id, p_room_temp, p_ph, p_ec, p_substrate_moisture, p_water_level_status, p_humidity
    ) RETURNING sensor_readings.reading_id INTO reading_id;
    
    RETURN reading_id;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Insert sample data
INSERT INTO sensor_readings (device_id, room_temp, ph, ec, substrate_moisture, water_level_status, humidity, timestamp)
SELECT 
    'grow-bag-' || (i % 6 + 1),
    (24 + random() * 6)::DECIMAL(4,1),
    (5.8 + random() * 0.8)::DECIMAL(4,2),
    (1.8 + random() * 0.6)::DECIMAL(4,2),
    (70 + random() * 20)::INTEGER,
    CASE WHEN random() > 0.9 THEN 'Below Required Level' ELSE 'Adequate' END,
    (70 + random() * 20)::INTEGER,
    NOW() - INTERVAL '1 minute' * (i * 5)
FROM generate_series(1, 100) as i
ON CONFLICT (reading_id, timestamp) DO NOTHING;

-- Step 10: Final verification
DO $$
DECLARE
    hypertable_count INTEGER;
    chunk_count INTEGER;
    reading_count INTEGER;
BEGIN
    -- Check hypertable
    SELECT COUNT(*) INTO hypertable_count 
    FROM timescaledb_information.hypertables 
    WHERE hypertable_name = 'sensor_readings';
    
    -- Check chunks
    SELECT COUNT(*) INTO chunk_count 
    FROM timescaledb_information.chunks 
    WHERE hypertable_name = 'sensor_readings';
    
    -- Check data
    SELECT COUNT(*) INTO reading_count FROM sensor_readings;
    
    RAISE NOTICE '=== TimescaleDB Setup Verification ===';
    RAISE NOTICE 'Hypertables created: %', hypertable_count;
    RAISE NOTICE 'Chunks created: %', chunk_count;
    RAISE NOTICE 'Sample readings inserted: %', reading_count;
    
    IF hypertable_count > 0 THEN
        RAISE NOTICE '✅ TimescaleDB setup successful!';
    ELSE
        RAISE NOTICE '❌ TimescaleDB setup failed!';
    END IF;
END $$;

ANALYZE sensor_readings;