-- =====================================================
-- USER PREFERENCES MIGRATION
-- =====================================================
-- Stores ALL user-specific preferences that persist
-- across login sessions (theme, notifications, etc.)
-- =====================================================

BEGIN;

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- UI Preferences
    theme VARCHAR(20) DEFAULT 'system', -- 'light', 'dark', 'system'
    language VARCHAR(10) DEFAULT 'en', -- 'en', 'es', 'fr', etc.
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    dashboard_layout VARCHAR(20) DEFAULT 'grid', -- 'grid', 'list', 'compact'
    
    -- Notification Preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    alert_sound BOOLEAN DEFAULT TRUE,
    notification_frequency VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'hourly', 'daily'
    
    -- Display Preferences
    temperature_unit VARCHAR(10) DEFAULT 'celsius', -- 'celsius', 'fahrenheit'
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    time_format VARCHAR(10) DEFAULT '24h', -- '12h', '24h'
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Chart/Graph Preferences
    default_chart_period VARCHAR(20) DEFAULT '24h', -- '1h', '24h', '7d', '30d'
    chart_animation BOOLEAN DEFAULT TRUE,
    
    -- Advanced Settings
    advanced_mode BOOLEAN DEFAULT FALSE,
    developer_mode BOOLEAN DEFAULT FALSE,
    auto_refresh BOOLEAN DEFAULT TRUE,
    refresh_interval INTEGER DEFAULT 30, -- seconds
    
    -- Custom JSON for additional settings
    custom_settings JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one preference row per user
    UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
    ON user_preferences(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_preferences_update_timestamp ON user_preferences;
CREATE TRIGGER user_preferences_update_timestamp
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_timestamp();

-- Add helpful comments
COMMENT ON TABLE user_preferences IS 'Stores all user-specific preferences that persist across sessions';
COMMENT ON COLUMN user_preferences.theme IS 'UI theme preference: light, dark, or system';
COMMENT ON COLUMN user_preferences.custom_settings IS 'JSONB for storing additional custom user preferences';

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT user_id FROM users
WHERE user_id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- Success message
DO $$
DECLARE
    pref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pref_count FROM user_preferences;
    RAISE NOTICE '✓ User preferences migration completed!';
    RAISE NOTICE '  - user_preferences table created';
    RAISE NOTICE '  - % user preference records created', pref_count;
    RAISE NOTICE '  - All preferences will now persist across sessions';
END $$;
