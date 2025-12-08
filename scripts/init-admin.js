// Script pour créer le premier admin
const fetch = require('node-fetch');

async function createFirstAdmin() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/first-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nom_complet: 'Administrateur',
        email: 'admin@pm.com',
        password: 'Admin123!',
        password_confirm: 'Admin123!'
      })
    });

    const data = await response.json();
    console.log('Réponse:', data);

    if (response.ok) {
      console.log('✅ Premier admin créé avec succès!');
      console.log('Email: admin@pm.com');
      console.log('Password: Admin123!');
    } else {
      console.log('❌ Erreur:', data.error);
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

createFirstAdmin();
