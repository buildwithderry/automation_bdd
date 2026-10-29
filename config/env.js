/**
 * Env loader. Dipilih lewat variable ENV (dev | uat | prod). Default: dev.
 * Salin .env.example ke .env.dev / .env.uat / .env.prod lalu isi.
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const ENV_NAME = (process.env.ENV || 'dev').toLowerCase();
const envFile = path.resolve(__dirname, '..', `.env.${ENV_NAME}`);

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: false, quiet: true });
} else {
  console.warn(`[env] File ${envFile} tidak ditemukan, memakai process.env apa adanya.`);
}

function val(key, fallback = '') {
  const raw = process.env[key];
  if (raw === undefined || raw === null) return fallback;
  return String(raw).trim();
}

function required(key) {
  const v = val(key);
  if (!v) throw new Error(`[env] ${key} wajib diisi di .env.${ENV_NAME}`);
  return v;
}

/**
 * Tolak placeholder yang belum diganti — lebih baik gagal cepat dengan pesan
 * jelas daripada membiarkan 30 test jatuh dengan pesan yang tidak menyebut sebab.
 */
const PLACEHOLDER = /^https?:\/\/(example\.(com|org|net|test)|localhost:3000)\/?$/i;

function alamat(key, fallback = '') {
  const v = val(key, fallback);
  if (!v) return v;
  if (PLACEHOLDER.test(v)) {
    throw new Error(
      `[env] ${key} masih berisi alamat contoh "${v}". ` +
        `Isi .env.${ENV_NAME} dengan alamat sungguhan.`
    );
  }
  return v;
}

const env = {
  name: ENV_NAME,
  baseUrl: {
    app: alamat('BASE_URL', 'https://www.saucedemo.com'),
  },
  cred: {
    /** User default untuk login. Override per-worker via fixture pool. */
    username: val('USERNAME', 'standard_user'),
    password: val('PASSWORD', 'secret_sauce'),
  },
  timeout: {
    action: Number(val('TIMEOUT_ACTION', '15000')),
    navigation: Number(val('TIMEOUT_NAVIGATION', '30000')),
    expect: Number(val('TIMEOUT_EXPECT', '10000')),
    test: Number(val('TIMEOUT_TEST', '120000')),
  },
  /**
   * HEADLESS default TRUE.
   * Untuk melihat jalannya test di laptop: HEADLESS=false npm run test:desktop
   */
  headless: val('HEADLESS', 'true') !== 'false',
  slowMo: Number(val('SLOWMO', '0')),
  required,
};

module.exports = { env };
