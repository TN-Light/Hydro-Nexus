-- Query to check your signup data in the database
-- Run this in pgAdmin to verify your user data is stored

-- 1. Check all users in the database
SELECT 
    user_id,
    username,
    email,
    first_name,
    last_name,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
FROM users 
ORDER BY created_at DESC;

-- 2. Check specifically the most recent user (should be yours)
SELECT 
    'Most Recent User:' as info,
    username,
    email,
    first_name || ' ' || last_name as full_name,
    role,
    created_at
FROM users 
WHERE is_active = true
ORDER BY created_at DESC 
LIMIT 1;

-- 3. Count total users
SELECT COUNT(*) as total_users FROM users WHERE is_active = true;

-- 4. Check if your specific email exists (replace with your email)
-- SELECT * FROM users WHERE email = 'your-email@example.com';