/**
 * SharePoint Integration Service
 * Service pour l'intégration avec Microsoft SharePoint via Microsoft Graph API
 */

import { ConfidentialClientApplication } from '@azure/msal-node';

// Configuration Azure AD
const msalConfig = {
  auth: {
    clientId: process.env.SHAREPOINT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID || ''}`,
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || ''
  }
};

// Instance MSAL (initialisée à la demande)
let msalInstance = null;

/**
 * Vérifier si SharePoint est configuré
 */
export const isSharePointConfigured = () => {
  return !!(
    process.env.SHAREPOINT_TENANT_ID &&
    process.env.SHAREPOINT_CLIENT_ID &&
    process.env.SHAREPOINT_CLIENT_SECRET &&
    process.env.SHAREPOINT_SITE_ID
  );
};

/**
 * Obtenir l'instance MSAL
 */
const getMsalInstance = () => {
  if (!msalInstance && isSharePointConfigured()) {
    msalInstance = new ConfidentialClientApplication(msalConfig);
  }
  return msalInstance;
};

/**
 * Obtenir un token d'accès pour Microsoft Graph
 */
export const getAccessToken = async () => {
  const msal = getMsalInstance();
  if (!msal) {
    throw new Error('SharePoint not configured');
  }

  try {
    const result = await msal.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default']
    });

    return result.accessToken;
  } catch (error) {
    console.error('Failed to acquire token:', error);
    throw error;
  }
};

/**
 * Faire une requête à Microsoft Graph API
 */
const graphRequest = async (endpoint, options = {}) => {
  const token = await getAccessToken();

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
    throw new Error(error.error?.message || `Graph API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Tester la connexion SharePoint
 */
export const testConnection = async () => {
  try {
    const siteId = process.env.SHAREPOINT_SITE_ID;
    const site = await graphRequest(`/sites/${siteId}`);

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
  const siteId = process.env.SHAREPOINT_SITE_ID;
  return graphRequest(`/sites/${siteId}`);
};

/**
 * Lister les drives (bibliothèques de documents)
 */
export const listDrives = async () => {
  const siteId = process.env.SHAREPOINT_SITE_ID;
  const result = await graphRequest(`/sites/${siteId}/drives`);
  return result.value;
};

/**
 * Obtenir le drive par défaut
 */
export const getDefaultDrive = async () => {
  const siteId = process.env.SHAREPOINT_SITE_ID;
  return graphRequest(`/sites/${siteId}/drive`);
};

/**
 * Créer un dossier pour un projet
 */
export const createProjectFolder = async (projectName, projectId) => {
  const drive = await getDefaultDrive();

  const folderName = `Projet_${projectId}_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}`;

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
      type, // 'view' ou 'edit'
      scope // 'anonymous', 'organization', ou 'users'
    })
  });

  return link.link;
};

/**
 * Uploader un fichier vers SharePoint
 */
export const uploadFile = async (folderId, fileName, fileContent, mimeType) => {
  const drive = await getDefaultDrive();

  // Pour les fichiers < 4MB, upload simple
  const endpoint = folderId
    ? `/drives/${drive.id}/items/${folderId}:/${fileName}:/content`
    : `/drives/${drive.id}/root:/${fileName}:/content`;

  const token = await getAccessToken();

  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': mimeType || 'application/octet-stream'
    },
    body: fileContent
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Upload failed: ${response.status}`);
  }

  return response.json();
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
    throw new Error(`Delete failed: ${response.status}`);
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
export const syncProjectFiles = async (projectId, localFiles) => {
  const results = {
    uploaded: [],
    errors: []
  };

  try {
    // Créer ou obtenir le dossier du projet
    const folder = await createProjectFolder(projectId, projectId);

    // Lister les fichiers existants
    const existingFiles = await listFiles(folder.id);
    const existingNames = new Set(existingFiles.map(f => f.name));

    // Uploader les nouveaux fichiers
    for (const file of localFiles) {
      if (!existingNames.has(file.name)) {
        try {
          const uploaded = await uploadFile(folder.id, file.name, file.content, file.mimeType);
          results.uploaded.push(uploaded);
        } catch (error) {
          results.errors.push({ file: file.name, error: error.message });
        }
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Sync failed: ${error.message}`);
  }
};

/**
 * Obtenir les statistiques de synchronisation
 */
export const getSyncStats = async () => {
  try {
    const drives = await listDrives();
    let totalFiles = 0;
    let totalSize = 0;

    for (const drive of drives) {
      if (drive.quota) {
        totalSize += drive.quota.used || 0;
      }
    }

    const files = await listFiles();
    totalFiles = files.length;

    return {
      drives: drives.length,
      totalFiles,
      totalSize,
      lastSync: new Date().toISOString()
    };
  } catch (error) {
    return {
      drives: 0,
      totalFiles: 0,
      totalSize: 0,
      error: error.message
    };
  }
};

export default {
  isSharePointConfigured,
  testConnection,
  getSiteInfo,
  listDrives,
  getDefaultDrive,
  createProjectFolder,
  listFiles,
  getFileMetadata,
  getDownloadUrl,
  createShareLink,
  uploadFile,
  deleteFile,
  searchFiles,
  syncProjectFiles,
  getSyncStats
};
