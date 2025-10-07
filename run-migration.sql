-- RUN THIS MIGRATION SCRIPT
-- Execute in PostgreSQL/TimescaleDB to update schema

\echo '==========================================';
\echo 'HYDRO NEXUS: Room-Level Sensor Migration';
\echo 'Date: October 6, 2025';
\echo '==========================================';

\echo '';
\echo 'STEP 1: Creating room_sensors table...';
\i migration-room-level-sensors.sql

\echo '';
\echo 'STEP 2: Inserting example data...';

-- Insert sample room sensor data
INSERT INTO room_sensors (room_id, room_temp, humidity, ph, ec, water_level_status)
VALUES 
    ('main-room', 22.5, 65, 6.2, 1.8, 'Adequate'),
    ('main-room', 22.3, 66, 6.1, 1.9, 'Adequate');

-- Insert sample bag moisture data
INSERT INTO sensor_readings (device_id, substrate_moisture, room_id, room_temp, humidity, ph, ec, water_level_status)
VALUES 
    ('grow-bag-1', 75, 'main-room', 0, 0, 0, 0, 'N/A'),
    ('grow-bag-2', 72, 'main-room', 0, 0, 0, 0, 'N/A'),
    ('grow-bag-3', 78, 'main-room', 0, 0, 0, 0, 'N/A'),
    ('grow-bag-4', 70, 'main-room', 0, 0, 0, 0, 'N/A'),
    ('grow-bag-5', 76, 'main-room', 0, 0, 0, 0, 'N/A'),
    ('grow-bag-6', 74, 'main-room', 0, 0, 0, 0, 'N/A');

\echo '';
\echo 'STEP 3: Testing new function...';

SELECT * FROM get_latest_sensor_readings_v2();

\echo '';
\echo '==========================================';
\echo 'Migration Complete!';
\echo '==========================================';
\echo '';
\echo 'Verification:';
\echo '- Room sensors table created: room_sensors';
\echo '- New function available: get_latest_sensor_readings_v2()';
\echo '- Sample data inserted';
\echo '';
\echo 'Next steps:';
\echo '1. Verify data: SELECT * FROM room_sensors;';
\echo '2. Test API: http://localhost:3000/api/sensors/latest';
\echo '3. Restart Next.js server';
\echo '';
