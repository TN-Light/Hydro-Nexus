const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Abhi@localhost:5432/hydro_nexus'
});

async function resetPassword() {
  try {
    const newPassword = 'Mypass123';
    const saltRounds = 12;
    
    console.log('Hashing new password...');
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('Updating password in database...');
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username, email',
      [password_hash, 'Abhi']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully for user:', result.rows[0]);
      
      // Test the new password
      console.log('Testing new password...');
      const isValid = await bcrypt.compare(newPassword, password_hash);
      console.log('Password verification test:', isValid ? '✅ PASS' : '❌ FAIL');
    } else {
      console.log('❌ No user found with username "Abhi"');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetPassword();