// Script pour corriger la base de données
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function fixDatabase() {
  try {
    console.log('Connexion à MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connecté!');

    // Supprimer les index dupliqués de la collection users
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('\nIndex actuels sur users:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    console.log('\n✅ Base de données vérifiée!');
    
    await mongoose.disconnect();
    console.log('Déconnecté.');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixDatabase();
