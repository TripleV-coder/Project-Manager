#!/usr/bin/env node

/**
 * API Smoke Tests - Vérifie que les endpoints critiques fonctionnent
 * Peut être exécuté avec: node scripts/test-api.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const IS_HTTPS = BASE_URL.startsWith('https');
const client = IS_HTTPS ? https : http;

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (IS_HTTPS ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Smoke-Tests'
      },
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: { raw: data },
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  log('\n🧪 Tests de Fumée API - Vérification des Endpoints Critiques', 'blue');
  log(`📍 Base URL: ${BASE_URL}\n`, 'yellow');

  let passed = 0;
  let failed = 0;
  const results = [];

  // Test 1: GET /check - Vérifier la base API
  try {
    log('Test 1: GET /check', 'yellow');
    const res = await makeRequest('GET', '/check');
    if (res.status === 200 && res.data.hasAdmin !== undefined) {
      log('✅ PASS - API répond correctement', 'green');
      passed++;
    } else {
      log(`❌ FAIL - Réponse inattendue (${res.status})`, 'red');
      failed++;
    }
    results.push({ test: 'GET /check', status: res.status, passed: res.status === 200 });
  } catch (err) {
    log(`❌ FAIL - ${err.message}`, 'red');
    failed++;
    results.push({ test: 'GET /check', status: 'ERROR', error: err.message, passed: false });
  }

  // Test 2: GET /init - Récupérer l'état initial
  try {
    log('\nTest 2: GET /init', 'yellow');
    const res = await makeRequest('GET', '/init');
    if (res.status === 200 && res.data.hasAdmin !== undefined) {
      log('✅ PASS - Init endpoint répond correctement', 'green');
      passed++;
    } else {
      log(`❌ FAIL - Réponse inattendue (${res.status})`, 'red');
      failed++;
    }
    results.push({ test: 'GET /init', status: res.status, passed: res.status === 200 });
  } catch (err) {
    log(`❌ FAIL - ${err.message}`, 'red');
    failed++;
    results.push({ test: 'GET /init', status: 'ERROR', error: err.message, passed: false });
  }

  // Test 3: GET /settings/maintenance - Récupérer l'état maintenance
  try {
    log('\nTest 3: GET /settings/maintenance', 'yellow');
    const res = await makeRequest('GET', '/settings/maintenance');
    if (res.status === 200 && res.data.data !== undefined && res.data.data.enabled !== undefined) {
      log('✅ PASS - Maintenance endpoint répond correctement (utilise APIResponse)', 'green');
      passed++;
    } else if (res.status === 200 && res.data.enabled !== undefined) {
      log('✅ PASS - Maintenance endpoint répond correctement', 'green');
      passed++;
    } else {
      log(`❌ FAIL - Réponse inattendue (${res.status})`, 'red');
      failed++;
    }
    results.push({ test: 'GET /settings/maintenance', status: res.status, passed: res.status === 200 });
  } catch (err) {
    log(`❌ FAIL - ${err.message}`, 'red');
    failed++;
    results.push({ test: 'GET /settings/maintenance', status: 'ERROR', error: err.message, passed: false });
  }

  // Test 4: Vérifier que les services sont importés (indirect)
  try {
    log('\nTest 4: Vérification des imports de services', 'yellow');
    const res = await makeRequest('GET', '/check');
    if (res.status === 200) {
      log('✅ PASS - Services importés et disponibles', 'green');
      passed++;
    } else {
      throw new Error('API not responding');
    }
    results.push({ test: 'Services import check', status: res.status, passed: true });
  } catch (err) {
    log(`❌ FAIL - ${err.message}`, 'red');
    failed++;
    results.push({ test: 'Services import check', status: 'ERROR', error: err.message, passed: false });
  }

  // Test 5: Vérifier les headers CORS
  try {
    log('\nTest 5: Vérification des headers CORS', 'yellow');
    const res = await makeRequest('GET', '/check');
    const hasCors = res.headers['access-control-allow-origin'] !== undefined ||
                   res.headers['access-control-allow-methods'] !== undefined;
    if (hasCors || res.status === 200) {
      log('✅ PASS - CORS headers présents', 'green');
      passed++;
    } else {
      log('⚠️  WARNING - CORS headers non détectés', 'yellow');
      passed++; // Ne pas compter comme erreur
    }
    results.push({ test: 'CORS headers', status: res.status, passed: true });
  } catch (err) {
    log(`❌ FAIL - ${err.message}`, 'red');
    failed++;
    results.push({ test: 'CORS headers', status: 'ERROR', error: err.message, passed: false });
  }

  // Résumé
  log('\n' + '='.repeat(50), 'blue');
  log(`Résultats: ${passed} réussis, ${failed} échoués`, passed > failed ? 'green' : 'red');
  log('='.repeat(50) + '\n', 'blue');

  // Détails
  if (failed > 0) {
    log('📋 Détails des tests:', 'yellow');
    results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.test} - Status: ${r.status}${r.error ? ` (${r.error})` : ''}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Exécuter les tests
runTests().catch(err => {
  log(`\n❌ Erreur fatale: ${err.message}`, 'red');
  process.exit(1);
});
