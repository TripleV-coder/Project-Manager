/**
 * DEPRECATED: Ce fichier est conservé pour rétrocompatibilité
 * Utiliser @/lib/db à la place pour les nouvelles implémentations
 *
 * Ce fichier réexporte simplement la connexion de db.js
 */

import connectDB, { isConnected, getConnectionStats } from './db';

// Réexporter pour rétrocompatibilité
export { connectDB, isConnected, getConnectionStats };
export default connectDB;
