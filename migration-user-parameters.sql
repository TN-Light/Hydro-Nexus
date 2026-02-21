-- =====================================================
-- USER-SPECIFIC OPTIMIZATION PARAMETERS MIGRATION
-- =====================================================
-- This migration adds user_parameters table to store
-- per-user optimization settings, fixing the security
-- issue where localStorage was shared between all users
-- =====================================================

-- Create user_parameters table with crop linkage
CREATE TABLE IF NOT EXISTS user_parameters (
    parameter_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_id VARCHAR(100), -- NULL means "all devices", otherwise specific device like "grow-bag-1"
    crop_id INTEGER REFERENCES crop_types(crop_id) ON DELETE SET NULL, -- Link to specific crop
    parameter_ranges JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one row per user per device per crop
    UNIQUE(user_id, device_id, crop_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_parameters_user_id 
    ON user_parameters(user_id);

CREATE INDEX IF NOT EXISTS idx_user_parameters_user_device 
    ON user_parameters(user_id, device_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_parameters_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_parameters_update_timestamp
    BEFORE UPDATE ON user_parameters
    FOR EACH ROW
    EXECUTE FUNCTION update_user_parameters_timestamp();

-- Add comment for documentation
COMMENT ON TABLE user_parameters IS 'Stores user-specific optimization parameter ranges for devices. Each user has independent settings that do not affect other users.';

COMMENT ON COLUMN user_parameters.device_id IS 'NULL for global "all devices" settings, or specific device_id like "grow-bag-1" for per-device settings';

COMMENT ON COLUMN user_parameters.crop_id IS 'Links parameters to specific crop type. When device crop changes, appropriate parameters are loaded automatically';

COMMENT ON COLUMN user_parameters.parameter_ranges IS 'JSONB storing parameter ranges like: {"temperature": {"min": 20, "max": 28}, "pH": {"min": 5.5, "max": 6.8}, ...}';

-- Insert default parameters for existing users (if any)
-- NOTE: ON CONFLICT target must match an existing UNIQUE/EXCLUSION constraint.
-- This table is unique on (user_id, device_id, crop_id), so we insert crop_id=NULL and
-- use that as the conflict target.
INSERT INTO user_parameters (user_id, device_id, crop_id, parameter_ranges)
SELECT 
    user_id,
    NULL as device_id, -- "all devices" default
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'User-specific parameters table created successfully!';
    RAISE NOTICE 'Each user now has isolated optimization settings.';
END $$;
