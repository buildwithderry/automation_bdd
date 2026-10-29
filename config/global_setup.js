/**
 * Bersihkan allure-results lama sebelum run.
 * History tetap aman karena disalin dari allure-report saat generate.
 */
const fs = require('fs');
const path = require('path');
const { env } = require('./env');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(ROOT, 'allure-results');

const sedangMendaftar = process.argv.includes('--list');

module.exports = async () => {
  if (sedangMendaftar) return;

  if (process.env.ALLURE_KEEP_RESULTS !== 'true' && fs.existsSync(RESULTS)) {
    for (const f of fs.readdirSync(RESULTS)) {
      if (f === 'history') continue;
      fs.rmSync(path.join(RESULTS, f), { recursive: true, force: true });
    }
  }
  fs.mkdirSync(RESULTS, { recursive: true });

  fs.writeFileSync(
    path.join(RESULTS, 'environment.properties'),
    [
      `Environment=${env.name}`,
      `BaseUrl=${env.baseUrl.app}`,
      `Headless=${env.headless}`,
      `Node=${process.version}`,
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    path.join(RESULTS, 'executor.json'),
    JSON.stringify({
      name: process.env.CI ? 'CI' : 'Local',
      type: process.env.CI ? 'github' : 'local',
      buildName: `saucedemo-${env.name}-#${process.env.BUILD_NUMBER || Date.now()}`,
      buildOrder: Number(process.env.BUILD_NUMBER || Math.floor(Date.now() / 1000)),
      reportName: 'SauceDemo E2E',
    }, null, 2),
    'utf8'
  );
};
