const bcrypt = require('bcryptjs');

async function testPassword() {
  // Test different possible passwords that might have been used
  const possiblePasswords = [
    'Mypass123',
    'MyPass123', 
    'mypass123',
    'Mypass@123',
    // Add any other variations you might have used
  ];

  // This is a sample hash - we'll get the real one from database
  console.log('Testing password verification...');
  
  for (const password of possiblePasswords) {
    console.log(`Testing password: "${password}"`);
    
    // Generate a test hash for this password
    const hash = await bcrypt.hash(password, 12);
    console.log(`Hash for "${password}": ${hash.substring(0, 20)}...`);
    
    // Test if it matches
    const isMatch = await bcrypt.compare(password, hash);
    console.log(`Self-verification: ${isMatch}`);
    console.log('---');
  }
}

testPassword().catch(console.error);