# Migration Execution Guide

## ✅ FIXED Migration Files Created

I've created two FIXED migration files that resolve your errors:

1. **migration-room-level-sensors-FIXED.sql** - Handles existing data in room_sensors
2. **migration-user-parameters-FIXED.sql** - Runs as single transaction

## 🚀 How to Run the Migrations

### Option 1: Using psql Command Line

```powershell
# 1. Run room-level sensors migration
psql $env:DATABASE_URL -f migration-room-level-sensors-FIXED.sql

# 2. Run user parameters migration  
psql $env:DATABASE_URL -f migration-user-parameters-FIXED.sql
```

### Option 2: Using psql Interactive Terminal

```powershell
# Enter psql
psql $env:DATABASE_URL

# Then run these commands inside psql:
\i migration-room-level-sensors-FIXED.sql
\i migration-user-parameters-FIXED.sql
\q
```

### Option 3: Copy-Paste (Most Reliable)

1. **Open psql terminal:**
   ```powershell
   psql $env:DATABASE_URL
   ```

2. **Copy the entire content of `migration-room-level-sensors-FIXED.sql`** and paste into psql

3. **Wait for success message:** `✓ Room-level sensors migration completed successfully!`

4. **Copy the entire content of `migration-user-parameters-FIXED.sql`** and paste into psql

5. **Wait for success message:** `✓ User parameters migration completed successfully!`

6. **Exit psql:**
   ```sql
   \q
   ```

## 🔍 Verification Commands

After running migrations, verify they worked:

```sql
-- Check room_sensors table exists
SELECT COUNT(*) FROM room_sensors;

-- Check user_parameters table exists  
SELECT COUNT(*) FROM user_parameters;

-- Check table structure
\d user_parameters
\d room_sensors
```

## ⚠️ What Was Fixed

### Problem 1: "table room_sensors is not empty"
**Solution:** The FIXED file checks if data exists before migrating. If room_sensors already has data, it skips the migration step.

### Problem 2: "cannot run multiple statements in single query"
**Solution:** The FIXED user-parameters file wraps everything in BEGIN/COMMIT transaction, and uses DO blocks for conditional logic.

## 📊 Expected Output

When migrations succeed, you'll see:

```
✓ Room-level sensors migration completed successfully!
  - room_sensors table ready
  - Helper functions created
  - Data migration completed (if needed)

✓ User parameters migration completed successfully!
  - user_parameters table created
  - X default parameter sets inserted
  - Each user now has isolated optimization settings
```

## 🐛 If You Still Get Errors

1. **Foreign key errors:** Make sure `users` and `crop_types` tables exist first
2. **Permission errors:** Ensure your database user has CREATE TABLE privileges
3. **Connection errors:** Verify your DATABASE_URL environment variable is set

Let me know what happens when you run these!
