-- =====================================================
-- FIXED: User Parameters Migration (Single Transaction)
-- =====================================================
-- Run this file INSTEAD of migration-user-parameters.sql
-- This version executes as a single transaction
-- =====================================================

BEGIN;

-- STEP 1: Create user_parameters table
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

-- STEP 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_parameters_user_id 
    ON user_parameters(user_id);

CREATE INDEX IF NOT EXISTS idx_user_parameters_user_device 
    ON user_parameters(user_id, device_id);

-- STEP 3: Create update trigger function
CREATE OR REPLACE FUNCTION update_user_parameters_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Create trigger
DROP TRIGGER IF EXISTS user_parameters_update_timestamp ON user_parameters;
CREATE TRIGGER user_parameters_update_timestamp
    BEFORE UPDATE ON user_parameters
    FOR EACH ROW
    EXECUTE FUNCTION update_user_parameters_timestamp();

-- STEP 5: Add comments
COMMENT ON TABLE user_parameters IS 'Stores user-specific optimization parameter ranges for devices. Each user has independent settings.';
COMMENT ON COLUMN user_parameters.device_id IS 'NULL for "all devices" settings, or specific device_id like "grow-bag-1"';
COMMENT ON COLUMN user_parameters.crop_id IS 'Links parameters to specific crop type. When device crop changes, parameters load automatically';
COMMENT ON COLUMN user_parameters.parameter_ranges IS 'JSONB storing parameter ranges';

-- STEP 6: Insert default parameters for existing users
INSERT INTO user_parameters (user_id, device_id, crop_id, parameter_ranges)
SELECT 
    user_id,
    NULL as device_id,
    NULL as crop_id,
    '{
        "temperature": {"min": 20, "max": 28},
        "humidity": {"min": 60, "max": 80},
        "pH": {"min": 5.5, "max": 6.8},
        "ec": {"min": 1.2, "max": 2.4},
        "ppm": {"min": 800, "max": 1400},
        "nitrogen": {"min": 150, "max": 200},
        "phosphorus": {"min": 30, "max": 50},
        "potassium": {"min": 200, "max": 300},
        "calcium": {"min": 150, "max": 200},
        "magnesium": {"min": 50, "max": 75},
        "iron": {"min": 2, "max": 5}
    }'::jsonb as parameter_ranges
FROM users
ON CONFLICT (user_id, device_id, crop_id) DO NOTHING;

COMMIT;

-- Success message (outside transaction)
DO $$
DECLARE
    param_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO param_count FROM user_parameters;
    RAISE NOTICE '✓ User parameters migration completed successfully!';
    RAISE NOTICE '  - user_parameters table created';
    RAISE NOTICE '  - % default parameter sets inserted', param_count;
    RAISE NOTICE '  - Each user now has isolated optimization settings';
END $$;
