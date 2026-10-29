#!/usr/bin/env node
/**
 * Generate Allure report SAMBIL MEMPERTAHANKAN TRENDS.
 *
 * Allure menyimpan trend di folder `history` di dalam report. Supaya grafik
 * Trend/History tidak reset tiap run, urutannya:
 *   1. ambil history dari report sebelumnya (atau dari cadangan allure-history/)
 *   2. salin ke allure-results/history
 *   3. generate report baru
 *   4. cadangkan lagi history-nya ke allure-history/
 *
 * npm run report          -> generate
 * npm run report:open     -> generate + buka di browser
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(ROOT, 'allure-results');
const REPORT = path.join(ROOT, 'allure-report');
const HISTORY_BACKUP = path.join(ROOT, 'allure-history');
const OPEN = process.argv.includes('--open');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
  return true;
}

/**
 * Penjagaannya menghitung BERKAS HASIL, bukan sekadar isi folder.
 *
 * `allure-results/` hampir selalu berisi `history/`, `environment.properties`,
 * dan `executor.json` — ketiganya ditulis global setup SEBELUM test berjalan.
 * Memeriksa "folder tidak kosong" karena itu selalu lolos, dan laporan yang
 * dihasilkan sunyi-sunyi kosong (0 test) tanpa satu pun peringatan.
 *
 * Penyebab paling sering: `--reporter=...` di CLI MENGGANTI seluruh daftar
 * reporter dari playwright.config.js, sehingga reporter Allure tidak ikut
 * terpasang dan tidak ada hasil yang ditulis sama sekali.
 */
const berkasHasil = fs.existsSync(RESULTS)
  ? fs.readdirSync(RESULTS).filter((f) => f.endsWith('-result.json'))
  : [];

if (!berkasHasil.length) {
  console.error('[allure] Tidak ada satu pun hasil test di allure-results/.');
  console.error('[allure] Kalau test BARU SAJA dijalankan, kemungkinan besar reporter Allure tidak terpasang:');
  console.error('[allure]   --reporter=line di CLI MENGGANTI seluruh reporter dari playwright.config.js.');
  console.error('[allure]   Jalankan tanpa flag itu, atau: --reporter=line,html,allure-playwright');
  process.exit(1);
}
console.log(`[allure] ${berkasHasil.length} hasil test ditemukan.`);

// 1 & 2 - pulihkan history
const fromReport = path.join(REPORT, 'history');
const restored =
  copyDir(fromReport, path.join(RESULTS, 'history')) ||
  copyDir(HISTORY_BACKUP, path.join(RESULTS, 'history'));
console.log(restored ? '[allure] history sebelumnya dipulihkan -> trends lanjut.' : '[allure] belum ada history (run pertama).');

// 3 - generate
const allureBin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'allure.cmd' : 'allure');
const args = ['generate', RESULTS, '--clean', '-o', REPORT];
console.log(`[allure] generate -> ${REPORT}`);
execFileSync(allureBin, args, { stdio: 'inherit', shell: process.platform === 'win32' });

// 4 - cadangkan history
fs.rmSync(HISTORY_BACKUP, { recursive: true, force: true });
copyDir(path.join(REPORT, 'history'), HISTORY_BACKUP);
console.log('[allure] history dicadangkan ke allure-history/');

if (OPEN) {
  execFileSync(allureBin, ['open', REPORT], { stdio: 'inherit', shell: process.platform === 'win32' });
}
