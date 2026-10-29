#!/usr/bin/env node
/** Hapus report + results + history (reset total trends). Pakai dengan sadar. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
for (const d of ['allure-results', 'allure-report', 'allure-history']) {
  fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
  console.log(`[allure] dihapus: ${d}`);
}
