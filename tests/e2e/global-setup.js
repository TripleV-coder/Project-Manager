const { spawnSync } = require('child_process');
const path = require('path');

module.exports = async function globalSetup() {
  const script = path.join(__dirname, '../../scripts/seed-e2e-accounts.js');
  const result = spawnSync(process.execPath, [script], {
    cwd: path.join(__dirname, '../..'),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error('Le seed des comptes E2E a échoué');
  }
};
