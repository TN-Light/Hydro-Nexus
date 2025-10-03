-- Update your username in the database
-- Change your stored username from 'venkatabhilash432004' to 'Abhi'

-- First, check your current username
SELECT username, email, first_name FROM users WHERE email = 'venkatabhilash432004@gmail.com';

-- Update to your desired username 'Abhi'
UPDATE users SET username = 'Abhi' WHERE email = 'venkatabhilash432004@gmail.com';

-- Verify the change
SELECT username, email, first_name FROM users WHERE email = 'venkatabhilash432004@gmail.com';