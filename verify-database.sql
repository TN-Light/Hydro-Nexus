-- =====================================================
-- DATABASE VERIFICATION SCRIPT
-- =====================================================
-- This checks if all required tables and data exist
-- =====================================================

\echo '🔍 Checking Database Structure...'
\echo ''

-- Check essential tables exist
\echo '📋 Essential Tables:'
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
        THEN '✓' ELSE '✗' END || ' users' as status
UNION ALL
SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices') 
        THEN '✓' ELSE '✗' END || ' devices'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crop_types') 
        THEN '✓' ELSE '✗' END || ' crop_types'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sensor_readings') 
        THEN '✓' ELSE '✗' END || ' sensor_readings'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_sensors') 
        THEN '✓' ELSE '✗' END || ' room_sensors'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_parameters') 
        THEN '✓' ELSE '✗' END || ' user_parameters'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alerts') 
        THEN '✓' ELSE '✗' END || ' alerts';

\echo ''
\echo '📊 Record Counts:'
SELECT 'users' as table_name, COUNT(*)::text || ' records' as count FROM users
UNION ALL
SELECT 'devices', COUNT(*)::text || ' records' FROM devices
UNION ALL
SELECT 'crop_types', COUNT(*)::text || ' records' FROM crop_types
UNION ALL
SELECT 'user_parameters', COUNT(*)::text || ' records' FROM user_parameters
UNION ALL
SELECT 'room_sensors', COUNT(*)::text || ' records' FROM room_sensors
UNION ALL
SELECT 'sensor_readings', COUNT(*)::text || ' records' FROM sensor_readings
UNION ALL
SELECT 'alerts', COUNT(*)::text || ' records' FROM alerts;

\echo ''
\echo '🌱 Available Crops:'
SELECT crop_id, name FROM crop_types ORDER BY crop_id;

\echo ''
\echo '🔑 Required Columns Check:'
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'crop_id'
    ) THEN '✓ devices.crop_id exists' 
    ELSE '✗ devices.crop_id MISSING' 
    END as status
UNION ALL
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_parameters' AND column_name = 'crop_id'
    ) THEN '✓ user_parameters.crop_id exists' 
    ELSE '✗ user_parameters.crop_id MISSING' 
    END
UNION ALL
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_readings' AND column_name = 'room_id'
    ) THEN '✓ sensor_readings.room_id exists' 
    ELSE '✗ sensor_readings.room_id MISSING' 
    END;

\echo ''
\echo '✨ Database verification complete!'
