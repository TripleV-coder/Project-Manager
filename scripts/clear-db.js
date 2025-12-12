import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function clearDatabase() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connecté!');

    const db = mongoose.connection.db;
    
    console.log('\n⏳ Suppression de toutes les collections...');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
      console.log(`  ✓ ${collection.name} - vidée`);
    }

    console.log('\n✅ Base de données complètement vidée!');
    
    await mongoose.disconnect();
    console.log('🔌 Déconnecté.');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

clearDatabase();
