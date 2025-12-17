/**
 * SharePoint Integration Service
 * Service pour l'intégration avec Microsoft SharePoint via Microsoft Graph API
 * Supporte la configuration via variables d'environnement OU base de données
 */

import { ConfidentialClientApplication } from '@azure/msal-node';

// Cache pour l'instance MSAL et la configuration
let msalInstance = null;
let cachedConfig = null;
let configLastFetch = null;
const CONFIG_CACHE_TTL = 60000; // 1 minute

/**
 * Charger la configuration depuis la base de données
 * @param {boolean} forceRefresh - Forcer le rechargement
 */
export const loadConfigFromDB = async (forceRefresh = false) => {
  // Vérifier le cache
  if (!forceRefresh && cachedConfig && configLastFetch && (Date.now() - configLastFetch < CONFIG_CACHE_TTL)) {
    return cachedConfig;
  }

  try {
    // Import dynamique pour éviter les problèmes de circularité
    const SharePointConfig = (await import('@/models/SharePointConfig')).default;
    const connectDB = (await import('@/lib/mongodb')).default;

    await connectDB();
    const config = await SharePointConfig.findById('sharepoint_config').select('+client_secret');

    if (config && config.enabled) {
      cachedConfig = {
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        siteId: config.site_id,
        syncEnabled: config.sync_enabled,
        syncInterval: config.sync_interval
      };
      configLastFetch = Date.now();

      // Réinitialiser l'instance MSAL si la config a changé
      msalInstance = null;
    } else {
      cachedConfig = null;
    }

    return cachedConfig;
  } catch (error) {
    console.error('Failed to load SharePoint config from DB:', error);
    return null;
  }
};

/**
 * Obtenir la configuration (DB ou env)
 */
const getConfig = async () => {
  // Essayer d'abord la DB
  const dbConfig = await loadConfigFromDB();

  if (dbConfig) {
    return dbConfig;
  }

  // Fallback sur les variables d'environnement
  if (process.env.SHAREPOINT_TENANT_ID && process.env.SHAREPOINT_CLIENT_ID) {
    return {
      tenantId: process.env.SHAREPOINT_TENANT_ID,
      clientId: process.env.SHAREPOINT_CLIENT_ID,
      clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
      siteId: process.env.SHAREPOINT_SITE_ID,
      syncEnabled: process.env.SHAREPOINT_ENABLED === 'true',
      syncInterval: 60
    };
  }

  return null;
};

/**
 * Vérifier si SharePoint est configuré
 */
export const isSharePointConfigured = async () => {
  const config = await getConfig();
  return !!(config && config.tenantId && config.clientId && config.clientSecret && config.siteId);
};

/**
 * Obtenir l'instance MSAL
 */
const getMsalInstance = async (customConfig = null) => {
  const config = customConfig || await getConfig();

  if (!config) {
    return null;
  }

  // Créer une nouvelle instance si nécessaire
  if (!msalInstance || customConfig) {
    const msalConfig = {
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientSecret: config.clientSecret
      }
    };

    if (customConfig) {
      // Instance temporaire pour test
      return new ConfidentialClientApplication(msalConfig);
    }

    msalInstance = new ConfidentialClientApplication(msalConfig);
  }

  return msalInstance;
};

/**
 * Obtenir un token d'accès pour Microsoft Graph
 */
export const getAccessToken = async (customConfig = null) => {
  const msal = await getMsalInstance(customConfig);

  if (!msal) {
    throw new Error('SharePoint non configuré');
  }

  try {
    const result = await msal.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default']
    });

    return result.accessToken;
  } catch (error) {
    console.error('Failed to acquire token:', error);
    throw new Error(`Échec d'authentification: ${error.message}`);
  }
};

/**
 * Faire une requête à Microsoft Graph API
 */
const graphRequest = async (endpoint, options = {}, customConfig = null) => {
  const token = await getAccessToken(customConfig);
  const config = customConfig || await getConfig();

  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Erreur Graph API: ${response.status}`);
  }

  // Pour les réponses vides (204 No Content)
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
};

/**
 * Tester la connexion SharePoint avec une configuration spécifique
 */
export const testConnectionWithConfig = async (config) => {
  try {
    const customConfig = {
      tenantId: config.tenant_id,
      clientId: config.client_id,
      clientSecret: config.client_secret,
      siteId: config.site_id
    };

    const site = await graphRequest(`/sites/${config.site_id}`, {}, customConfig);

    return {
      success: true,
      site: {
        id: site.id,
        name: site.displayName,
        webUrl: site.webUrl
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Tester la connexion SharePoint (config actuelle)
 */
export const testConnection = async () => {
  try {
    const config = await getConfig();

    if (!config) {
      return {
        success: false,
        error: 'SharePoint non configuré'
      };
    }

    const site = await graphRequest(`/sites/${config.siteId}`);

    return {
      success: true,
      site: {
        id: site.id,
        name: site.displayName,
        webUrl: site.webUrl
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Obtenir les informations du site SharePoint
 */
export const getSiteInfo = async () => {
  const config = await getConfig();
  if (!config) throw new Error('SharePoint non configuré');
  return graphRequest(`/sites/${config.siteId}`);
};

/**
 * Lister les drives (bibliothèques de documents)
 */
export const listDrives = async () => {
  const config = await getConfig();
  if (!config) throw new Error('SharePoint non configuré');
  const result = await graphRequest(`/sites/${config.siteId}/drives`);
  return result.value;
};

/**
 * Obtenir le drive par défaut
 */
export const getDefaultDrive = async () => {
  const config = await getConfig();
  if (!config) throw new Error('SharePoint non configuré');
  return graphRequest(`/sites/${config.siteId}/drive`);
};

/**
 * Créer un dossier pour un projet
 */
export const createProjectFolder = async (projectName, projectId) => {
  const drive = await getDefaultDrive();
  const folderName = `Projet_${projectId}_${projectName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50)}`;

  try {
    // Vérifier si le dossier existe déjà
    const existing = await graphRequest(`/drives/${drive.id}/root:/${folderName}`);
    return existing;
  } catch {
    // Créer le dossier s'il n'existe pas
    const folder = await graphRequest(`/drives/${drive.id}/root/children`, {
      method: 'POST',
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      })
    });

    return folder;
  }
};

/**
 * Obtenir ou créer un dossier projet par son chemin
 */
export const getOrCreateProjectFolder = async (projectId, projectName) => {
  try {
    return await createProjectFolder(projectName, projectId);
  } catch (error) {
    console.error('Error creating project folder:', error);
    throw error;
  }
};

/**
 * Lister les fichiers d'un dossier
 */
export const listFiles = async (folderId = null) => {
  const drive = await getDefaultDrive();

  const endpoint = folderId
    ? `/drives/${drive.id}/items/${folderId}/children`
    : `/drives/${drive.id}/root/children`;

  const result = await graphRequest(endpoint);
  return result.value;
};

/**
 * Obtenir les métadonnées d'un fichier
 */
export const getFileMetadata = async (fileId) => {
  const drive = await getDefaultDrive();
  return graphRequest(`/drives/${drive.id}/items/${fileId}`);
};

/**
 * Obtenir le lien de téléchargement d'un fichier
 */
export const getDownloadUrl = async (fileId) => {
  const drive = await getDefaultDrive();
  const file = await graphRequest(`/drives/${drive.id}/items/${fileId}`);
  return file['@microsoft.graph.downloadUrl'];
};

/**
 * Créer un lien de partage
 */
export const createShareLink = async (fileId, type = 'view', scope = 'organization') => {
  const drive = await getDefaultDrive();

  const link = await graphRequest(`/drives/${drive.id}/items/${fileId}/createLink`, {
    method: 'POST',
    body: JSON.stringify({
      type,
      scope
    })
  });

  return link.link;
};

/**
 * Uploader un fichier vers SharePoint
 * @param {string} folderId - ID du dossier cible (null pour racine)
 * @param {string} fileName - Nom du fichier
 * @param {Buffer|string} fileContent - Contenu du fichier
 * @param {string} mimeType - Type MIME
 */
export const uploadFile = async (folderId, fileName, fileContent, mimeType) => {
  const drive = await getDefaultDrive();

  // Convertir base64 en Buffer si nécessaire
  let content = fileContent;
  if (typeof fileContent === 'string' && fileContent.includes('base64,')) {
    const base64Data = fileContent.split('base64,')[1];
    content = Buffer.from(base64Data, 'base64');
  } else if (typeof fileContent === 'string') {
    content = Buffer.from(fileContent, 'base64');
  }

  const endpoint = folderId
    ? `/drives/${drive.id}/items/${folderId}:/${encodeURIComponent(fileName)}:/content`
    : `/drives/${drive.id}/root:/${encodeURIComponent(fileName)}:/content`;

  const token = await getAccessToken();

  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': mimeType || 'application/octet-stream'
    },
    body: content
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Upload échoué: ${response.status}`);
  }

  return response.json();
};

/**
 * Uploader un fichier dans le dossier d'un projet
 */
export const uploadFileToProject = async (projectId, projectName, fileName, fileContent, mimeType) => {
  // Obtenir ou créer le dossier du projet
  const folder = await getOrCreateProjectFolder(projectId, projectName);

  // Uploader le fichier
  return uploadFile(folder.id, fileName, fileContent, mimeType);
};

/**
 * Supprimer un fichier
 */
export const deleteFile = async (fileId) => {
  const drive = await getDefaultDrive();

  const token = await getAccessToken();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${drive.id}/items/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(`Suppression échouée: ${response.status}`);
  }

  return { success: true };
};

/**
 * Rechercher des fichiers
 */
export const searchFiles = async (query) => {
  const drive = await getDefaultDrive();

  const result = await graphRequest(
    `/drives/${drive.id}/root/search(q='${encodeURIComponent(query)}')`
  );

  return result.value;
};

/**
 * Synchroniser les fichiers d'un projet
 */
export const syncProjectFiles = async (projectId, projectName, localFiles) => {
  const results = {
    uploaded: [],
    skipped: [],
    errors: []
  };

  try {
    // Créer ou obtenir le dossier du projet
    const folder = await getOrCreateProjectFolder(projectId, projectName);

    // Lister les fichiers existants sur SharePoint
    const existingFiles = await listFiles(folder.id);
    const existingNames = new Set(existingFiles.map(f => f.name.toLowerCase()));

    // Uploader les nouveaux fichiers
    for (const file of localFiles) {
      const normalizedName = file.nom_original || file.name;

      if (existingNames.has(normalizedName.toLowerCase())) {
        results.skipped.push({ name: normalizedName, reason: 'Existe déjà' });
        continue;
      }

      try {
        // Extraire le contenu du fichier
        let content = file.url || file.content;

        const uploaded = await uploadFile(folder.id, normalizedName, content, file.type_mime || file.mimeType);
        results.uploaded.push({
          name: normalizedName,
          sharepoint_id: uploaded.id,
          sharepoint_url: uploaded.webUrl
        });
      } catch (error) {
        results.errors.push({
          file_name: normalizedName,
          error: error.message
        });
      }
    }

    return {
      success: true,
      folder_id: folder.id,
      folder_url: folder.webUrl,
      ...results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      ...results
    };
  }
};

/**
 * Synchroniser tous les fichiers de tous les projets
 */
export const syncAllProjects = async () => {
  const results = {
    projects_synced: 0,
    files_synced: 0,
    files_failed: 0,
    errors: []
  };

  try {
    const connectDB = (await import('@/lib/mongodb')).default;
    const Project = (await import('@/models/Project')).default;
    const File = (await import('@/models/File')).default;

    await connectDB();

    // Récupérer tous les projets actifs
    const projects = await Project.find({
      archivé: { $ne: true },
      statut: { $ne: 'Annulé' }
    }).select('_id nom');

    for (const project of projects) {
      try {
        // Récupérer les fichiers du projet non encore synchronisés
        const files = await File.find({
          projet_id: project._id,
          sharepoint_synced: { $ne: true }
        });

        if (files.length === 0) continue;

        const syncResult = await syncProjectFiles(
          project._id.toString(),
          project.nom,
          files
        );

        if (syncResult.success) {
          results.projects_synced++;
          results.files_synced += syncResult.uploaded.length;
          results.files_failed += syncResult.errors.length;

          // Mettre à jour les fichiers synchronisés
          for (const uploaded of syncResult.uploaded) {
            await File.findOneAndUpdate(
              { projet_id: project._id, nom_original: uploaded.name },
              {
                sharepoint_id: uploaded.sharepoint_id,
                sharepoint_url: uploaded.sharepoint_url,
                sharepoint_synced: true,
                last_sync_sharepoint: new Date()
              }
            );
          }

          // Mettre à jour la config du projet
          await Project.findByIdAndUpdate(project._id, {
            'sharepoint_config.enabled': true,
            'sharepoint_config.folder_path': syncResult.folder_url,
            'sharepoint_config.last_sync': new Date()
          });
        }

        results.errors.push(...syncResult.errors);
      } catch (error) {
        results.errors.push({
          project_id: project._id,
          project_name: project.nom,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    return {
      ...results,
      error: error.message
    };
  }
};

/**
 * Obtenir les statistiques de synchronisation
 */
export const getSyncStats = async () => {
  try {
    const drives = await listDrives();
    let totalSize = 0;

    for (const drive of drives) {
      if (drive.quota) {
        totalSize += drive.quota.used || 0;
      }
    }

    const files = await listFiles();

    return {
      connected: true,
      drives: drives.length,
      totalFiles: files.length,
      totalSize,
      lastSync: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      drives: 0,
      totalFiles: 0,
      totalSize: 0,
      error: error.message
    };
  }
};

/**
 * Invalider le cache de configuration
 */
export const invalidateConfigCache = () => {
  cachedConfig = null;
  configLastFetch = null;
  msalInstance = null;
};

export default {
  isSharePointConfigured,
  loadConfigFromDB,
  testConnection,
  testConnectionWithConfig,
  getSiteInfo,
  listDrives,
  getDefaultDrive,
  createProjectFolder,
  getOrCreateProjectFolder,
  listFiles,
  getFileMetadata,
  getDownloadUrl,
  createShareLink,
  uploadFile,
  uploadFileToProject,
  deleteFile,
  searchFiles,
  syncProjectFiles,
  syncAllProjects,
  getSyncStats,
  invalidateConfigCache
};
