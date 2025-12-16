// Script to create the first admin user
// WARNING: This is a setup script - never commit actual credentials
// USAGE: node scripts/init-admin.js <email> <password>

// Use native fetch (Node 18+) or fallback to node-fetch
const fetch = globalThis.fetch || require('node-fetch');

async function createFirstAdmin() {
  // Get credentials from command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Usage: node scripts/init-admin.js <email> <password>');
    console.error('');
    console.error('Example: node scripts/init-admin.js admin@example.com "MySecurePassword123!"');
    console.error('');
    console.error('Password requirements:');
    console.error('  - 8-128 characters');
    console.error('  - At least 1 uppercase letter');
    console.error('  - At least 1 lowercase letter');
    console.error('  - At least 1 digit');
    console.error('  - At least 1 special character: !@#$%^&*(),.?":{}|<>');
    process.exit(1);
  }

  const email = args[0];
  const password = args[1];

  // Basic validation
  if (!email.includes('@')) {
    console.error('❌ Invalid email address');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    process.exit(1);
  }

  try {
    const response = await fetch('http://localhost:3000/api/auth/first-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nom_complet: 'Administrator',
        email: email,
        password: password,
        password_confirm: password
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ First admin user created successfully!');
      console.log(`   Email: ${email}`);
      console.log('   ⚠️  Keep this password safe - do not commit it to version control');
    } else {
      console.log('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createFirstAdmin();
