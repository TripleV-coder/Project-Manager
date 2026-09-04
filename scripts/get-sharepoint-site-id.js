#!/usr/bin/env node
/**
 * Script pour obtenir le Site ID SharePoint
 * Usage: node scripts/get-sharepoint-site-id.js <tenant-id> <client-id> <client-secret> <sharepoint-url>
 *
 * Exemple:
 * node scripts/get-sharepoint-site-id.js \
 *   "votre-tenant-id" \
 *   "votre-client-id" \
 *   "votre-client-secret" \
 *   "votreorg.sharepoint.com" \
 *   "sites/VotreSite"
 */

const https = require('https');

async function getAccessToken(tenantId, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }).toString();

    const options = {
      hostname: 'login.microsoftonline.com',
      path: `/${tenantId}/oauth2/v2.0/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            resolve(result.access_token);
          } else {
            reject(new Error(result.error_description || 'Failed to get token'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getSiteId(accessToken, hostname, sitePath) {
  return new Promise((resolve, reject) => {
    const path = sitePath ? `/v1.0/sites/${hostname}:/${sitePath}` : `/v1.0/sites/${hostname}`;

    const options = {
      hostname: 'graph.microsoft.com',
      path: path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.id) {
            resolve(result);
          } else {
            reject(new Error(result.error?.message || 'Site not found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       Script pour obtenir le Site ID SharePoint               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Usage:                                                       ║
║  node scripts/get-sharepoint-site-id.js \\                    ║
║    <tenant-id> \\                                              ║
║    <client-id> \\                                              ║
║    <client-secret> \\                                          ║
║    <sharepoint-hostname> \\                                    ║
║    [site-path]                                                ║
║                                                               ║
║  Exemple:                                                     ║
║  node scripts/get-sharepoint-site-id.js \\                    ║
║    "abc123-..." \\                                             ║
║    "def456-..." \\                                             ║
║    "secret..." \\                                              ║
║    "contoso.sharepoint.com" \\                                 ║
║    "sites/Projets"                                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    process.exit(1);
  }

  const [tenantId, clientId, clientSecret, hostname, sitePath] = args;

  console.log("\n🔐 Obtention du token d'accès...");

  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    console.log('✅ Token obtenu avec succès');

    console.log('\n📍 Récupération des informations du site...');
    const site = await getSiteId(token, hostname, sitePath);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              INFORMATIONS DU SITE SHAREPOINT                  ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Nom:      ${site.displayName.padEnd(48)}║`);
    console.log(`║  URL:      ${site.webUrl.substring(0, 48).padEnd(48)}║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  SITE ID (à copier dans .env):                                ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  ${site.id}`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    console.log('\n📋 Ajoutez cette ligne dans votre fichier .env:\n');
    console.log(`SHAREPOINT_SITE_ID=${site.id}`);
    console.log('');
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
