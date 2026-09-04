#!/usr/bin/env node
/**
 * Script de vérification des configurations
 * Usage: node scripts/check-config.js
 */

require('dotenv').config();

const checkMark = '✅';
const crossMark = '❌';
const warningMark = '⚠️';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║          VÉRIFICATION DES CONFIGURATIONS PM                   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Configuration de base
console.log('📦 CONFIGURATION DE BASE');
console.log('─'.repeat(60));

const checkEnv = (name, required = true) => {
  const value = process.env[name];
  const exists = !!value;
  const status = exists ? checkMark : required ? crossMark : warningMark;
  console.log(
    `${status} ${name.padEnd(35)} ${exists ? '✓ Configuré' : required ? '✗ REQUIS' : '○ Optionnel'}`
  );
  return exists;
};

// Base
const hasMongoUrl = checkEnv('MONGO_URL', true);
const hasJwtSecret = checkEnv('JWT_SECRET', true);
const hasBaseUrl = checkEnv('NEXT_PUBLIC_BASE_URL', true);
checkEnv('NEXT_PUBLIC_APP_URL', false);

console.log('\n🔌 SOCKET.IO');
console.log('─'.repeat(60));
checkEnv('SOCKET_SERVER_URL', false);
checkEnv('SOCKET_PORT', false);

console.log('\n📧 EMAIL (SMTP)');
console.log('─'.repeat(60));
const hasSmtpHost = checkEnv('SMTP_HOST', false);
checkEnv('SMTP_PORT', false);
const hasSmtpUser = checkEnv('SMTP_USER', false);
const hasSmtpPass = checkEnv('SMTP_PASS', false);
checkEnv('SMTP_FROM', false);

const emailConfigured = hasSmtpHost && hasSmtpUser && hasSmtpPass;
console.log(
  `\n   ${emailConfigured ? checkMark : warningMark} Service Email: ${emailConfigured ? 'Configuré' : 'Non configuré (emails désactivés)'}`
);

console.log('\n🔔 PUSH NOTIFICATIONS');
console.log('─'.repeat(60));
const hasVapidPublic = checkEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', false);
const hasVapidPrivate = checkEnv('VAPID_PRIVATE_KEY', false);
checkEnv('VAPID_SUBJECT', false);

const pushConfigured = hasVapidPublic && hasVapidPrivate;
console.log(
  `\n   ${pushConfigured ? checkMark : warningMark} Push Notifications: ${pushConfigured ? 'Configurées' : 'Non configurées (push désactivé)'}`
);

console.log('\n☁️ SHAREPOINT');
console.log('─'.repeat(60));
checkEnv('SHAREPOINT_ENABLED', false);
const hasSpTenant = checkEnv('SHAREPOINT_TENANT_ID', false);
const hasSpClient = checkEnv('SHAREPOINT_CLIENT_ID', false);
const hasSpSecret = checkEnv('SHAREPOINT_CLIENT_SECRET', false);
const hasSpSite = checkEnv('SHAREPOINT_SITE_ID', false);

const sharePointConfigured = hasSpTenant && hasSpClient && hasSpSecret && hasSpSite;
const sharePointEnabled = process.env.SHAREPOINT_ENABLED === 'true';
console.log(
  `\n   ${sharePointConfigured && sharePointEnabled ? checkMark : warningMark} SharePoint: ${sharePointEnabled ? (sharePointConfigured ? 'Configuré et activé' : 'Activé mais incomplet') : 'Désactivé'}`
);

// Résumé
console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                         RÉSUMÉ                                ║');
console.log('╠═══════════════════════════════════════════════════════════════╣');

const baseOk = hasMongoUrl && hasJwtSecret && hasBaseUrl;
console.log(
  `║  Configuration de base:    ${baseOk ? checkMark + ' Prête' : crossMark + ' Incomplète'}                         ║`
);
console.log(
  `║  Email SMTP:               ${emailConfigured ? checkMark + ' Activé' : warningMark + ' Désactivé'}                        ║`
);
console.log(
  `║  Push Notifications:       ${pushConfigured ? checkMark + ' Activées' : warningMark + ' Désactivées'}                      ║`
);
console.log(
  `║  SharePoint:               ${sharePointConfigured && sharePointEnabled ? checkMark + ' Connecté' : warningMark + ' Désactivé'}                       ║`
);
console.log('╚═══════════════════════════════════════════════════════════════╝');

if (!baseOk) {
  console.log('\n❌ ERREUR: Configuration de base incomplète!');
  console.log('   Veuillez configurer MONGO_URL, JWT_SECRET et NEXT_PUBLIC_BASE_URL');
  process.exit(1);
} else {
  console.log('\n✅ Application prête à démarrer!');
  console.log('   yarn dev     - Démarrer en mode développement');
  console.log('   yarn build   - Build de production');
  console.log('');
}
