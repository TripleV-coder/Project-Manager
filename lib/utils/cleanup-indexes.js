// Script pour nettoyer les index MongoDB et éviter les warnings
// Ce fichier sera utilisé pour supprimer les index dupliqués

export async function cleanupIndexes(db) {
  try {
    // Les collections à nettoyer
    const collections = [
      'users',
      'roles', 
      'projects',
      'tasks',
      'projecttemplates',
      'sprints',
      'deliverables',
      'deliverabletypes',
      'timesheetentries',
      'expenses',
      'comments',
      'notifications',
      'auditlogs',
      'files'
    ];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        console.log(`${collectionName}: ${indexes.length} index(es)`);
      } catch (_e) {
        // Collection n'existe pas encore
      }
    }
  } catch (error) {
    console.error('Erreur cleanup indexes:', error);
  }
}
