-- =====================================================
-- DISMISSED ALERTS MIGRATION
-- =====================================================
-- Track which alerts users have dismissed
-- =====================================================

BEGIN;

-- Add dismissed_by column to alerts table
ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS dismissed_by UUID[] DEFAULT '{}';

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_alerts_dismissed 
    ON alerts USING GIN (dismissed_by);

-- Add helpful comment
COMMENT ON COLUMN alerts.dismissed_by IS 'Array of user_ids who have dismissed this alert';

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ Dismissed alerts tracking enabled!';
    RAISE NOTICE '  - dismissed_by column added to alerts table';
    RAISE NOTICE '  - Users can now dismiss alerts permanently';
END $$;
