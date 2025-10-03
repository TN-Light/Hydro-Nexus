-- Reset password for user 'Abhi' to 'Mypass123'
-- This will hash the password properly and update it in the database

-- First, let's see the current user
SELECT username, email, first_name FROM users WHERE username = 'Abhi';

-- We'll need to run this in Node.js to properly hash the password
-- The SQL equivalent would be complex, so let's use the API approach